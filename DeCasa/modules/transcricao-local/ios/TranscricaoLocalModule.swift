import AVFoundation
import ExpoModulesCore
import Speech

/**
 * RF06 com RNF03: transcreve o arquivo gravado só no aparelho.
 * Usa SpeechAnalyzer (iOS 26+): o SFSpeechRecognizer encerra na primeira pausa e perderia o resto da receita (spike S1).
 * Antes do iOS 26, `disponivel` devolve false e o app abre a revisão com o áudio para ouvir.
 */
public class TranscricaoLocalModule: Module {
  private var tarefa: Task<String, Error>?

  public func definition() -> ModuleDefinition {
    Name("TranscricaoLocal")

    AsyncFunction("disponivel") { (idioma: String) async -> Bool in
      guard #available(iOS 26.0, *) else { return false }
      return await SpeechTranscriber.supportedLocale(equivalentTo: Locale(identifier: idioma)) != nil
    }

    AsyncFunction("pedirPermissao") { () async -> Bool in
      await withCheckedContinuation { continuacao in
        SFSpeechRecognizer.requestAuthorization { continuacao.resume(returning: $0 == .authorized) }
      }
    }

    AsyncFunction("transcrever") { (uri: String, idioma: String) async throws -> String in
      guard #available(iOS 26.0, *) else { throw Exception(name: "Indisponivel", description: "Transcrição exige iOS 26.") }
      guard let url = URL(string: uri), url.isFileURL else { throw Exception(name: "UriInvalida", description: uri) }
      let nova = Task { try await Self.transcrever(url: url, idioma: idioma) }
      tarefa = nova
      defer { tarefa = nil }
      return try await nova.value
    }

    Function("cancelar") {
      tarefa?.cancel()
    }
  }

  @available(iOS 26.0, *)
  private static func transcrever(url: URL, idioma: String) async throws -> String {
    guard let locale = await SpeechTranscriber.supportedLocale(equivalentTo: Locale(identifier: idioma)) else {
      throw Exception(name: "IdiomaNaoSuportado", description: idioma)
    }
    let transcritor = SpeechTranscriber(locale: locale, preset: .transcription)
    // Baixa só o modelo do idioma, uma vez; o áudio nunca sai do aparelho.
    // No iOS o app precisa reservar o idioma antes ("not subscribed to transcription.pt" sem isso).
    if !(await AssetInventory.reservedLocales.contains(locale)) {
      _ = try await AssetInventory.reserve(locale: locale)
    }
    if let pedido = try await AssetInventory.assetInstallationRequest(supporting: [transcritor]) {
      try await pedido.downloadAndInstall()
    }
    let analisador = SpeechAnalyzer(modules: [transcritor])
    let trechos = Task {
      try await transcritor.results.reduce(into: [String]()) { $0.append(String($1.text.characters)) }
    }
    try await withTaskCancellationHandler {
      try await analisador.start(inputAudioFile: try AVAudioFile(forReading: url), finishAfterFile: true)
    } onCancel: {
      trechos.cancel()
      Task { await analisador.cancelAndFinishNow() }
    }
    return try await trechos.value.joined(separator: " ").trimmingCharacters(in: .whitespacesAndNewlines)
  }
}
