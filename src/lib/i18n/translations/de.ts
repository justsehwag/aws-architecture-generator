/**
 * German translations.
 */
const de = {
  // Navigation
  "nav.dashboard": "Übersicht",
  "nav.create": "Diagramm erstellen",
  "nav.templates": "Vorlagen",
  "nav.settings": "Einstellungen",
  "nav.logout": "Abmelden",
  "nav.login": "Anmelden",

  // Actions
  "action.generate": "Generieren",
  "action.export": "Exportieren",
  "action.import": "Importieren",
  "action.save": "Speichern",
  "action.delete": "Löschen",
  "action.undo": "Rückgängig",
  "action.redo": "Wiederholen",
  "action.cancel": "Abbrechen",
  "action.confirm": "Bestätigen",
  "action.retry": "Erneut versuchen",
  "action.close": "Schließen",
  "action.search": "Suchen",
  "action.filter": "Filtern",
  "action.clear": "Leeren",
  "action.copy": "Kopieren",
  "action.download": "Herunterladen",
  "action.upload": "Hochladen",
  "action.compare": "Vergleichen",
  "action.restore": "Wiederherstellen",

  // Status
  "status.loading": "Laden",
  "status.generating": "Wird generiert",
  "status.ready": "Bereit",
  "status.error": "Fehler",
  "status.offline": "Offline",
  "status.saving": "Wird gespeichert",
  "status.saved": "Gespeichert",
  "status.syncing": "Wird synchronisiert",
  "status.analyzing": "Wird analysiert",

  // Labels
  "label.architecture": "Architektur",
  "label.services": "Dienste",
  "label.connections": "Verbindungen",
  "label.cost": "Kosten",
  "label.analysis": "Analyse",
  "label.recommendations": "Empfehlungen",
  "label.description": "Beschreibung",
  "label.name": "Name",
  "label.region": "Region",
  "label.version": "Version",
  "label.versions": "Versionen",
  "label.template": "Vorlage",
  "label.category": "Kategorie",
  "label.total": "Gesamt",
  "label.monthly": "Monatlich",
  "label.perMonth": "pro Monat",

  // Page Titles
  "page.dashboard.title": "Übersicht",
  "page.dashboard.subtitle": "Ihr Architektur-Arbeitsbereich",
  "page.create.title": "Diagramm erstellen",
  "page.create.subtitle":
    "Beschreiben Sie Ihre AWS-Architektur in einfachem Deutsch",
  "page.templates.title": "Vorlagen",
  "page.templates.subtitle":
    "Durchsuchen und verwenden Sie Architekturvorlagen",
  "page.settings.title": "Einstellungen",
  "page.settings.subtitle": "Verwalten Sie Ihre Anwendungseinstellungen",
  "page.diagram.title": "Diagramm-Ansicht",

  // Settings
  "settings.appearance": "Erscheinungsbild",
  "settings.theme": "Design",
  "settings.theme.light": "Hell",
  "settings.theme.dark": "Dunkel",
  "settings.theme.system": "System",
  "settings.theme.description":
    "Wählen Sie das Erscheinungsbild. System folgt den Betriebssystemeinstellungen.",
  "settings.region": "Standard-AWS-Region",
  "settings.region.description":
    "Die Standardregion für die Generierung neuer Architekturdiagramme.",
  "settings.model": "KI-Modell",
  "settings.model.description":
    "Das KI-Modell zur Interpretation von Eingaben und Generierung von Architekturspezifikationen.",
  "settings.language": "Sprache",
  "settings.language.description":
    "Wählen Sie die Anzeigesprache der Anwendungsoberfläche.",
  "settings.shortcuts": "Tastenkürzel",
  "settings.shortcuts.description":
    "Referenz der verfügbaren Tastenkürzel im Diagramm-Editor.",
  "settings.shortcuts.shortcut": "Tastenkürzel",
  "settings.shortcuts.action": "Aktion",

  // Prompt Input
  "prompt.placeholder": "Beschreiben Sie Ihre AWS-Architektur...",
  "prompt.charCount": "{count} / {max} Zeichen",
  "prompt.minLength": "Die Eingabe muss mindestens 10 Zeichen lang sein",
  "prompt.maxLength": "Die Eingabe darf 5000 Zeichen nicht überschreiten",

  // Export
  "export.title": "Diagramm exportieren",
  "export.format": "Format",
  "export.options": "Optionen",
  "export.resolution": "Auflösung (DPI)",
  "export.pageSize": "Seitengröße",

  // Analysis
  "analysis.title": "Architekturanalyse",
  "analysis.wellArchitected": "Well-Architected-Bewertung",
  "analysis.security": "Sicherheit",
  "analysis.reliability": "Zuverlässigkeit",
  "analysis.performance": "Leistungseffizienz",
  "analysis.costOptimization": "Kostenoptimierung",
  "analysis.operational": "Betriebliche Exzellenz",
  "analysis.sustainability": "Nachhaltigkeit",
  "analysis.noGaps": "Keine Lücken gefunden",
  "analysis.gapsFound": "Lücken gefunden",
  "analysis.severity.critical": "Kritisch",
  "analysis.severity.recommended": "Empfohlen",
  "analysis.severity.optional": "Optional",

  // Cost
  "cost.title": "Kostenschätzung",
  "cost.total": "Monatliche Gesamtkosten",
  "cost.unavailable": "Schätzung nicht verfügbar",
  "cost.noServices": "Keine Dienste zur Schätzung",
  "cost.assumptions": "Nutzungsannahmen",
  "cost.compute": "Rechenzeit / Monat",
  "cost.requests": "Anfragen / Monat",
  "cost.dataTransfer": "Datentransfer (GB)",
  "cost.storage": "Speicher (GB)",

  // Version History
  "version.title": "Versionsverlauf",
  "version.autosave": "Automatisch gespeichert",
  "version.restore": "Diese Version wiederherstellen",
  "version.current": "Aktuell",
  "version.noVersions": "Keine Versionen verfügbar",

  // Errors
  "error.generic": "Ein Fehler ist aufgetreten. Bitte erneut versuchen.",
  "error.network":
    "Netzwerkfehler. Bitte überprüfen Sie Ihre Verbindung.",
  "error.timeout":
    "Zeitüberschreitung. Bitte erneut versuchen.",
  "error.unauthorized": "Sitzung abgelaufen. Bitte erneut anmelden.",
  "error.validation":
    "Bitte überprüfen Sie Ihre Eingabe und versuchen Sie es erneut.",
  "error.notFound": "Ressource nicht gefunden.",
  "error.fileTooLarge":
    "Datei überschreitet die maximale Größe von 10 MB.",
  "error.invalidFormat": "Nicht unterstütztes Dateiformat.",
  "error.generationFailed":
    "Diagramm-Generierung fehlgeschlagen. Bitte formulieren Sie Ihre Eingabe um.",
  "error.exportFailed": "Export fehlgeschlagen. Bitte erneut versuchen.",
  "error.saveFailed":
    "Speichern fehlgeschlagen. Änderungen werden lokal gespeichert.",
  "error.offlineQueue":
    "Sie sind offline. Änderungen werden bei Verbindung synchronisiert.",

  // Tooltips
  "tooltip.generate": "Architekturdiagramm aus Eingabe generieren",
  "tooltip.export": "Diagramm in verschiedenen Formaten exportieren",
  "tooltip.zoomIn": "Vergrößern",
  "tooltip.zoomOut": "Verkleinern",
  "tooltip.resetZoom": "Zoom zurücksetzen",
  "tooltip.undo": "Rückgängig (Strg+Z)",
  "tooltip.redo": "Wiederholen (Strg+Y)",
  "tooltip.delete": "Ausgewähltes Element löschen",
  "tooltip.darkMode": "Dunkelmodus umschalten",
  "tooltip.compare": "Architekturversionen vergleichen",
  "tooltip.voiceInput": "Spracheingabe",

  // Templates
  "template.builtIn": "Integriert",
  "template.custom": "Benutzerdefiniert",
  "template.useCases": "Anwendungsfälle",
  "template.saveAs": "Als Vorlage speichern",
  "template.limitReached":
    "Maximum von 25 benutzerdefinierten Vorlagen erreicht.",

  // Confirmation dialogs
  "confirm.delete.title": "Knoten löschen",
  "confirm.delete.message":
    "Möchten Sie diesen Knoten wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
  "confirm.regenerate.title": "Diagramm neu generieren",
  "confirm.regenerate.message":
    "Das aktuelle Diagramm wird verworfen. Sind Sie sicher?",
  "confirm.restore.title": "Version wiederherstellen",
  "confirm.restore.message":
    "Der aktuelle Zustand wird vor der Wiederherstellung automatisch gespeichert.",
} as const;

export default de;
