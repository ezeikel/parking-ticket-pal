//
//  VisionDocumentPlugin.mm
//  document-detector
//
//  A VisionCamera frame-processor plugin that runs Apple Vision's ML document
//  segmentation (VNDetectDocumentSegmentationRequest) on each camera frame and
//  returns the detected document's 4 corners + confidence. Used by
//  hooks/useDocumentDetection.ts as the iOS "premium" detector, replacing the
//  OpenCV/Otsu path which splays into hands/shadows.
//
//  Orientation: Vision's segmentation model needs a roughly UPRIGHT image, so we
//  map the VisionCamera frame orientation (passed from JS) to the
//  CGImagePropertyOrientation that rotates the raw sensor buffer upright and run
//  Vision in that upright (display) space. Vision returns normalized corners with
//  a BOTTOM-LEFT origin (y up); we flip y to a TOP-LEFT origin (y down). The JS
//  worklet then inverse-rotates these display-space corners back into raw-sensor
//  space so the rest of its pipeline (smoothing, state machine, the
//  cornersNormalized rotation) is unchanged and consistent with the OpenCV path.
//
//  NOTE: VNDetectDocumentSegmentationRequest has limited iOS-Simulator support
//  (per SimCam's docs and observed behaviour: it returns a degenerate band on the
//  simulator regardless of input). It works on macOS and on physical devices.
//

#import <VisionCamera/Frame.h>
#import <VisionCamera/FrameProcessorPlugin.h>
#import <VisionCamera/FrameProcessorPluginRegistry.h>

#import <Vision/Vision.h>
#import <CoreMedia/CoreMedia.h>
#import <CoreVideo/CoreVideo.h>
#import <ImageIO/ImageIO.h>

@interface VisionDocumentPlugin : FrameProcessorPlugin
@end

@implementation VisionDocumentPlugin

- (instancetype)initWithProxy:(VisionCameraProxyHolder*)proxy withOptions:(NSDictionary*)options {
  return [super initWithProxy:proxy withOptions:options];
}

- (id)callback:(Frame*)frame withArguments:(NSDictionary*)arguments {
  if (@available(iOS 15.0, *)) {
    CVPixelBufferRef pixelBuffer = CMSampleBufferGetImageBuffer(frame.buffer);
    if (pixelBuffer == nil) {
      return nil;
    }

    // Diagnostics (cheap; read via the worklet's __DEV__ debug probe on a dev
    // build — stripped/unreadable in a release build). Lets us confirm on a real
    // device that Vision is actually running and on what buffer.
    OSType fmt = CVPixelBufferGetPixelFormatType(pixelBuffer);
    char fmtChars[5] = {
      (char)((fmt >> 24) & 0xFF), (char)((fmt >> 16) & 0xFF),
      (char)((fmt >> 8) & 0xFF), (char)(fmt & 0xFF), 0
    };
    NSString* dbgPixelFormat = [NSString stringWithFormat:@"%s", fmtChars];
    size_t bw = CVPixelBufferGetWidth(pixelBuffer);
    size_t bh = CVPixelBufferGetHeight(pixelBuffer);

    // Rotate the raw sensor buffer upright for Vision. The mapping mirrors the
    // worklet's (validated) raw->display rotation: portrait = .up,
    // portrait-upside-down = .down (180°), landscape-left = .right (90° CW),
    // landscape-right = .left (90° CCW). Default to .up for unknown/portrait.
    CGImagePropertyOrientation orientation = kCGImagePropertyOrientationUp;
    NSString* ori = nil;
    if ([arguments isKindOfClass:[NSDictionary class]]) {
      id rawOri = arguments[@"orientation"];
      if ([rawOri isKindOfClass:[NSString class]]) {
        ori = (NSString*)rawOri;
      }
    }
    if ([ori isEqualToString:@"landscape-right"]) {
      orientation = kCGImagePropertyOrientationLeft;
    } else if ([ori isEqualToString:@"landscape-left"]) {
      orientation = kCGImagePropertyOrientationRight;
    } else if ([ori isEqualToString:@"portrait-upside-down"]) {
      orientation = kCGImagePropertyOrientationDown;
    }

    VNDetectDocumentSegmentationRequest* request = [[VNDetectDocumentSegmentationRequest alloc] init];

    VNImageRequestHandler* handler =
        [[VNImageRequestHandler alloc] initWithCVPixelBuffer:pixelBuffer
                                                 orientation:orientation
                                                     options:@{}];

    NSError* error = nil;
    [handler performRequests:@[ request ] error:&error];
    if (error != nil) {
      return nil;
    }

    // Echo back what orientation arg we received + applied, so JS can confirm the
    // arg crosses the bridge and which CGImagePropertyOrientation was used.
    NSString* dbgReceivedOri = ori ? ori : @"(nil)";
    NSNumber* dbgAppliedOri = @((int)orientation);

    NSArray<VNRectangleObservation*>* results = request.results;
    if (results.count == 0) {
      // Not an error — a valid "no document this frame" outcome.
      return @{
        @"confidence" : @(0.0),
        @"dbgReceivedOri" : dbgReceivedOri,
        @"dbgAppliedOri" : dbgAppliedOri,
        @"dbgPixelFormat" : dbgPixelFormat,
        @"dbgBufW" : @(bw),
        @"dbgBufH" : @(bh),
      };
    }

    VNRectangleObservation* doc = results.firstObject;

    // Corners are in the upright (display) normalized space because we oriented
    // the buffer above. Flip y (bottom-left origin -> top-left origin); order the
    // visual corners TL, TR, BR, BL. The worklet inverse-rotates these to raw.
    NSArray* corners = @[
      @{@"x" : @(doc.topLeft.x), @"y" : @(1.0 - doc.topLeft.y)},
      @{@"x" : @(doc.topRight.x), @"y" : @(1.0 - doc.topRight.y)},
      @{@"x" : @(doc.bottomRight.x), @"y" : @(1.0 - doc.bottomRight.y)},
      @{@"x" : @(doc.bottomLeft.x), @"y" : @(1.0 - doc.bottomLeft.y)},
    ];

    return @{
      @"corners" : corners,
      @"confidence" : @(doc.confidence),
      @"dbgReceivedOri" : dbgReceivedOri,
      @"dbgAppliedOri" : dbgAppliedOri,
      @"dbgPixelFormat" : dbgPixelFormat,
      @"dbgBufW" : @(bw),
      @"dbgBufH" : @(bh),
    };
  }

  return nil;
}

VISION_EXPORT_FRAME_PROCESSOR(VisionDocumentPlugin, detectDocumentFrame)

@end
