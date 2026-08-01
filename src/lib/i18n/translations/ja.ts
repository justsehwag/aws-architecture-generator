/**
 * Japanese translations.
 */
const ja = {
  // Navigation
  "nav.dashboard": "ダッシュボード",
  "nav.create": "ダイアグラム作成",
  "nav.templates": "テンプレート",
  "nav.settings": "設定",
  "nav.logout": "ログアウト",
  "nav.login": "ログイン",

  // Actions
  "action.generate": "生成",
  "action.export": "エクスポート",
  "action.import": "インポート",
  "action.save": "保存",
  "action.delete": "削除",
  "action.undo": "元に戻す",
  "action.redo": "やり直す",
  "action.cancel": "キャンセル",
  "action.confirm": "確認",
  "action.retry": "再試行",
  "action.close": "閉じる",
  "action.search": "検索",
  "action.filter": "フィルター",
  "action.clear": "クリア",
  "action.copy": "コピー",
  "action.download": "ダウンロード",
  "action.upload": "アップロード",
  "action.compare": "比較",
  "action.restore": "復元",

  // Status
  "status.loading": "読み込み中",
  "status.generating": "生成中",
  "status.ready": "準備完了",
  "status.error": "エラー",
  "status.offline": "オフライン",
  "status.saving": "保存中",
  "status.saved": "保存済み",
  "status.syncing": "同期中",
  "status.analyzing": "分析中",

  // Labels
  "label.architecture": "アーキテクチャ",
  "label.services": "サービス",
  "label.connections": "接続",
  "label.cost": "コスト",
  "label.analysis": "分析",
  "label.recommendations": "推奨事項",
  "label.description": "説明",
  "label.name": "名前",
  "label.region": "リージョン",
  "label.version": "バージョン",
  "label.versions": "バージョン一覧",
  "label.template": "テンプレート",
  "label.category": "カテゴリ",
  "label.total": "合計",
  "label.monthly": "月額",
  "label.perMonth": "/ 月",

  // Page Titles
  "page.dashboard.title": "ダッシュボード",
  "page.dashboard.subtitle": "アーキテクチャワークスペース",
  "page.create.title": "ダイアグラム作成",
  "page.create.subtitle": "AWSアーキテクチャを自然言語で記述してください",
  "page.templates.title": "テンプレート",
  "page.templates.subtitle": "アーキテクチャテンプレートを閲覧・使用",
  "page.settings.title": "設定",
  "page.settings.subtitle": "アプリケーションの設定を管理",
  "page.diagram.title": "ダイアグラムビューア",

  // Settings
  "settings.appearance": "外観",
  "settings.theme": "テーマ",
  "settings.theme.light": "ライト",
  "settings.theme.dark": "ダーク",
  "settings.theme.system": "システム",
  "settings.theme.description":
    "アプリケーションの外観を選択します。「システム」はOSの設定に従います。",
  "settings.region": "デフォルトAWSリージョン",
  "settings.region.description":
    "新しいアーキテクチャダイアグラムを生成する際のデフォルトリージョン。",
  "settings.model": "AIモデル",
  "settings.model.description":
    "プロンプトの解釈とアーキテクチャ仕様の生成に使用するAIモデル。",
  "settings.language": "言語",
  "settings.language.description":
    "アプリケーションインターフェースの表示言語を選択してください。",
  "settings.shortcuts": "キーボードショートカット",
  "settings.shortcuts.description":
    "ダイアグラムエディタで使用できるキーボードショートカットの一覧。",
  "settings.shortcuts.shortcut": "ショートカット",
  "settings.shortcuts.action": "操作",

  // Prompt Input
  "prompt.placeholder": "AWSアーキテクチャを記述してください...",
  "prompt.charCount": "{count} / {max} 文字",
  "prompt.minLength": "プロンプトは10文字以上で入力してください",
  "prompt.maxLength": "プロンプトは5000文字を超えることはできません",

  // Export
  "export.title": "ダイアグラムのエクスポート",
  "export.format": "フォーマット",
  "export.options": "オプション",
  "export.resolution": "解像度 (DPI)",
  "export.pageSize": "ページサイズ",

  // Analysis
  "analysis.title": "アーキテクチャ分析",
  "analysis.wellArchitected": "Well-Architected評価",
  "analysis.security": "セキュリティ",
  "analysis.reliability": "信頼性",
  "analysis.performance": "パフォーマンス効率",
  "analysis.costOptimization": "コスト最適化",
  "analysis.operational": "運用の卓越性",
  "analysis.sustainability": "持続可能性",
  "analysis.noGaps": "問題なし",
  "analysis.gapsFound": "問題あり",
  "analysis.severity.critical": "重大",
  "analysis.severity.recommended": "推奨",
  "analysis.severity.optional": "任意",

  // Cost
  "cost.title": "コスト見積もり",
  "cost.total": "月額合計コスト",
  "cost.unavailable": "見積もり不可",
  "cost.noServices": "見積もり対象のサービスがありません",
  "cost.assumptions": "使用量の前提条件",
  "cost.compute": "コンピューティング時間 / 月",
  "cost.requests": "リクエスト数 / 月",
  "cost.dataTransfer": "データ転送量 (GB)",
  "cost.storage": "ストレージ (GB)",

  // Version History
  "version.title": "バージョン履歴",
  "version.autosave": "自動保存",
  "version.restore": "このバージョンを復元",
  "version.current": "現在",
  "version.noVersions": "バージョンがありません",

  // Errors
  "error.generic": "エラーが発生しました。もう一度お試しください。",
  "error.network": "ネットワークエラー。接続を確認してください。",
  "error.timeout": "リクエストがタイムアウトしました。もう一度お試しください。",
  "error.unauthorized": "セッションが期限切れです。再度ログインしてください。",
  "error.validation": "入力内容を確認して、もう一度お試しください。",
  "error.notFound": "リソースが見つかりません。",
  "error.fileTooLarge": "ファイルが最大サイズ10 MBを超えています。",
  "error.invalidFormat": "サポートされていないファイル形式です。",
  "error.generationFailed":
    "ダイアグラムの生成に失敗しました。プロンプトを修正してください。",
  "error.exportFailed":
    "エクスポートに失敗しました。もう一度お試しください。",
  "error.saveFailed":
    "保存に失敗しました。変更はローカルに保持されています。",
  "error.offlineQueue":
    "オフラインです。接続が復旧すると変更が同期されます。",

  // Tooltips
  "tooltip.generate": "プロンプトからアーキテクチャダイアグラムを生成",
  "tooltip.export": "複数の形式でダイアグラムをエクスポート",
  "tooltip.zoomIn": "拡大",
  "tooltip.zoomOut": "縮小",
  "tooltip.resetZoom": "ズームをリセット",
  "tooltip.undo": "元に戻す (Ctrl+Z)",
  "tooltip.redo": "やり直す (Ctrl+Y)",
  "tooltip.delete": "選択した要素を削除",
  "tooltip.darkMode": "ダークモード切替",
  "tooltip.compare": "アーキテクチャバージョンを比較",
  "tooltip.voiceInput": "音声入力",

  // Templates
  "template.builtIn": "組み込み",
  "template.custom": "カスタム",
  "template.useCases": "ユースケース",
  "template.saveAs": "テンプレートとして保存",
  "template.limitReached":
    "カスタムテンプレートの上限（25件）に達しました。",

  // Confirmation dialogs
  "confirm.delete.title": "ノードを削除",
  "confirm.delete.message":
    "このノードを削除してもよろしいですか？この操作は元に戻せません。",
  "confirm.regenerate.title": "ダイアグラムを再生成",
  "confirm.regenerate.message":
    "現在のダイアグラムは破棄されます。よろしいですか？",
  "confirm.restore.title": "バージョンを復元",
  "confirm.restore.message":
    "復元前に現在の状態が自動保存されます。",
} as const;

export default ja;
