Pod::Spec.new do |s|
  s.name           = 'TranscricaoLocal'
  s.version        = '1.0.0'
  s.summary        = 'Transcrição de arquivo de áudio no aparelho (SpeechAnalyzer).'
  s.author         = 'Paulo Henrique'
  s.homepage       = 'https://github.com/Ph-Alves/DeCasa'
  s.license        = 'MIT'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
  s.swift_version = '5.9'
end
