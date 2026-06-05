import ExpoModulesCore
import Vision
import UIKit

// Map UIKit's image orientation to the Core Graphics orientation Vision
// expects, so requests analyse pixels in display orientation. Shared by
// detectDocument (segmentation) and recognizeText (OCR).
private func cgOrientation(from o: UIImage.Orientation) -> CGImagePropertyOrientation {
  switch o {
  case .up: return .up
  case .down: return .down
  case .left: return .left
  case .right: return .right
  case .upMirrored: return .upMirrored
  case .downMirrored: return .downMirrored
  case .leftMirrored: return .leftMirrored
  case .rightMirrored: return .rightMirrored
  @unknown default: return .up
  }
}

public class DocumentDetectorModule: Module {
  public func definition() -> ModuleDefinition {
    Name("DocumentDetector")

    // Run Apple's Vision document segmentation on a still image and return the
    // detected document's 4 corners as normalized [0,1] points, plus a
    // confidence score. Returns null if no document is found.
    //
    // Spike goal: compare Vision's quad against the OpenCV/Otsu quad on real
    // captures where the OpenCV path latches onto background texture.
    //
    // Coordinate space: Vision returns corners in normalized image coordinates
    // with the ORIGIN AT BOTTOM-LEFT (y up). We flip y so callers get
    // top-left-origin (y down), matching how the JS/Skia overlay expects them.
    AsyncFunction("detectDocument") { (uri: String, promise: Promise) in
      guard let url = URL(string: uri) else {
        promise.reject("E_BAD_URI", "Could not parse URI: \(uri)")
        return
      }

      guard let imageData = try? Data(contentsOf: url),
            let uiImage = UIImage(data: imageData),
            let cgImage = uiImage.cgImage else {
        promise.reject("E_LOAD_IMAGE", "Could not load image at: \(uri)")
        return
      }

      // The decoded cgImage holds RAW sensor pixels; the JPEG's orientation is
      // carried separately in uiImage.imageOrientation. If we hand the raw
      // cgImage to Vision without that orientation, Vision analyses sideways
      // pixels and returns corners in raw-pixel space — but PostCapture renders
      // the photo with orientation applied, so the quad lands rotated/offset.
      // Map UIImage.Orientation → CGImagePropertyOrientation and pass it to the
      // handler so Vision works in DISPLAY orientation, matching the preview.
      let orientation = cgOrientation(from: uiImage.imageOrientation)
      // Displayed dimensions = the UIImage's size (already orientation-aware),
      // not the raw cgImage.width/height which are pre-rotation.
      let displayWidth = Int(uiImage.size.width)
      let displayHeight = Int(uiImage.size.height)

      if #available(iOS 15.0, *) {
        let request = VNDetectDocumentSegmentationRequest { request, error in
          if let error = error {
            promise.reject("E_VISION", error.localizedDescription)
            return
          }

          guard
            let results = request.results as? [VNRectangleObservation],
            let doc = results.first
          else {
            // No document found — return null, not an error. A failed
            // detection is a valid outcome we want to measure.
            promise.resolve(nil)
            return
          }

          // VNRectangleObservation corners: bottom-left origin, y up.
          // Flip y to top-left origin to match the rest of the app.
          func flip(_ p: CGPoint) -> [String: CGFloat] {
            return ["x": p.x, "y": 1.0 - p.y]
          }

          // Vision's corner naming is relative to the observation in its OWN
          // (y-up) space. After our y-flip, topLeft (high y in Vision) becomes
          // low y = visual top. So the visual order we hand back is:
          //   [0] visual top-left, [1] visual top-right,
          //   [2] visual bottom-right, [3] visual bottom-left
          let corners: [[String: CGFloat]] = [
            flip(doc.topLeft),
            flip(doc.topRight),
            flip(doc.bottomRight),
            flip(doc.bottomLeft),
          ]

          promise.resolve([
            "corners": corners,
            "confidence": doc.confidence,
            // Report orientation-aware (displayed) dimensions so the JS side's
            // aspect-fit projection matches how the photo is rendered.
            "imageWidth": displayWidth,
            "imageHeight": displayHeight,
          ])
        }

        // Pass the image orientation so Vision's normalized corners come back
        // in the same display space the photo is shown in.
        let handler = VNImageRequestHandler(cgImage: cgImage, orientation: orientation, options: [:])
        // ExpoModulesCore dispatches AsyncFunction bodies off the main queue,
        // so performing the (synchronous) Vision request directly here is fine.
        do {
          try handler.perform([request])
        } catch {
          promise.reject("E_VISION_PERFORM", error.localizedDescription)
        }
      } else {
        promise.reject("E_UNSUPPORTED", "VNDetectDocumentSegmentationRequest requires iOS 15+")
      }
    }

    // Apple Vision text recognition (VNRecognizeTextRequest). Returns one entry
    // per recognized line — { text, confidence } — where confidence is Vision's
    // own 0–1 score for that line's best candidate. The JS side uses the
    // confidence to weight a cross-read consensus vote per field, so a sharp read
    // outweighs a blurry/angled misread. Returns [] if nothing is found.
    //
    // Why this lives here: Google ML Kit ships no arm64-simulator slice, so on
    // Apple-Silicon sims the app falls back to a mock. Vision is part of iOS and
    // runs on the simulator too — so it's the live-OCR engine for iOS on BOTH
    // device and simulator. Android keeps ML Kit. The caller produces the still
    // (a throwaway takePhoto()); we OCR it and extractTicketFieldCandidates()
    // parses the lines the same way it parses ML Kit's output.
    AsyncFunction("recognizeText") { (uri: String, promise: Promise) in
      guard let url = URL(string: uri) else {
        promise.reject("E_BAD_URI", "Could not parse URI: \(uri)")
        return
      }

      guard let imageData = try? Data(contentsOf: url),
            let uiImage = UIImage(data: imageData),
            let cgImage = uiImage.cgImage else {
        promise.reject("E_LOAD_IMAGE", "Could not load image at: \(uri)")
        return
      }

      let orientation = cgOrientation(from: uiImage.imageOrientation)

      if #available(iOS 13.0, *) {
        let request = VNRecognizeTextRequest { request, error in
          if let error = error {
            promise.reject("E_VISION_TEXT", error.localizedDescription)
            return
          }
          let observations = request.results as? [VNRecognizedTextObservation] ?? []
          // Best candidate per detected line, with Vision's confidence (0–1).
          let lines: [[String: Any]] = observations.compactMap { obs in
            guard let candidate = obs.topCandidates(1).first else { return nil }
            return ["text": candidate.string, "confidence": candidate.confidence]
          }
          promise.resolve(lines)
        }
        // Printed tickets → favour accuracy over speed; language correction
        // helps with reference numbers, postcodes and addresses.
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true

        let handler = VNImageRequestHandler(cgImage: cgImage, orientation: orientation, options: [:])
        do {
          try handler.perform([request])
        } catch {
          promise.reject("E_VISION_TEXT_PERFORM", error.localizedDescription)
        }
      } else {
        promise.reject("E_UNSUPPORTED", "VNRecognizeTextRequest requires iOS 13+")
      }
    }
  }
}
