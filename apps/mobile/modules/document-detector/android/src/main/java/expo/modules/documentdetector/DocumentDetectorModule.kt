package expo.modules.documentdetector

import expo.modules.kotlin.Promise
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class DocumentDetectorModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("DocumentDetector")

    // Android stub for the spike. iOS uses VNDetectDocumentSegmentationRequest;
    // there's no first-party per-image document-quad API on Android, so this
    // returns null and Android keeps the existing OpenCV pipeline. If the iOS
    // spike proves out, Android gets its own detector (ML Kit / TFLite) later.
    AsyncFunction("detectDocument") { _: String, promise: Promise ->
      promise.resolve(null)
    }
  }
}
