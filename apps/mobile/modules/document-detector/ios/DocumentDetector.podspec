Pod::Spec.new do |s|
  s.name           = 'DocumentDetector'
  s.version        = '1.0.0'
  s.summary        = 'A sample project summary'
  s.description    = 'A sample project description'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = {
    :ios => '16.4',
    :tvos => '16.4'
  }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'
  # Required by VisionDocumentPlugin.mm (the live Apple Vision frame-processor).
  s.dependency 'VisionCamera'

  # Swift/Objective-C compatibility
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  # VisionDocumentPlugin.mm registers with VisionCamera via an ObjC `+load`.
  # The linker dead-strips that from this static library unless the consuming
  # (app) target force-loads ObjC symbols — otherwise initFrameProcessorPlugin()
  # returns null and we silently fall back to OpenCV. `-ObjC` keeps the +load.
  s.user_target_xcconfig = {
    'OTHER_LDFLAGS' => '-ObjC',
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
