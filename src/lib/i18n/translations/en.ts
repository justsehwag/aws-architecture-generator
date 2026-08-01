/**
 * English translations (complete reference).
 * All other locale files must cover the same keys.
 */
const en = {
  // Navigation
  "nav.dashboard": "Dashboard",
  "nav.create": "Create Diagram",
  "nav.templates": "Templates",
  "nav.settings": "Settings",
  "nav.logout": "Log Out",
  "nav.login": "Log In",

  // Actions
  "action.generate": "Generate",
  "action.export": "Export",
  "action.import": "Import",
  "action.save": "Save",
  "action.delete": "Delete",
  "action.undo": "Undo",
  "action.redo": "Redo",
  "action.cancel": "Cancel",
  "action.confirm": "Confirm",
  "action.retry": "Retry",
  "action.close": "Close",
  "action.search": "Search",
  "action.filter": "Filter",
  "action.clear": "Clear",
  "action.copy": "Copy",
  "action.download": "Download",
  "action.upload": "Upload",
  "action.compare": "Compare",
  "action.restore": "Restore",

  // Status
  "status.loading": "Loading",
  "status.generating": "Generating",
  "status.ready": "Ready",
  "status.error": "Error",
  "status.offline": "Offline",
  "status.saving": "Saving",
  "status.saved": "Saved",
  "status.syncing": "Syncing",
  "status.analyzing": "Analyzing",

  // Labels
  "label.architecture": "Architecture",
  "label.services": "Services",
  "label.connections": "Connections",
  "label.cost": "Cost",
  "label.analysis": "Analysis",
  "label.recommendations": "Recommendations",
  "label.description": "Description",
  "label.name": "Name",
  "label.region": "Region",
  "label.version": "Version",
  "label.versions": "Versions",
  "label.template": "Template",
  "label.category": "Category",
  "label.total": "Total",
  "label.monthly": "Monthly",
  "label.perMonth": "per month",

  // Page Titles
  "page.dashboard.title": "Dashboard",
  "page.dashboard.subtitle": "Your architecture workspace",
  "page.create.title": "Create Diagram",
  "page.create.subtitle": "Describe your AWS architecture in plain English",
  "page.templates.title": "Templates",
  "page.templates.subtitle": "Browse and use architecture templates",
  "page.settings.title": "Settings",
  "page.settings.subtitle": "Manage your application preferences",
  "page.diagram.title": "Diagram Viewer",

  // Settings
  "settings.appearance": "Appearance",
  "settings.theme": "Theme",
  "settings.theme.light": "Light",
  "settings.theme.dark": "Dark",
  "settings.theme.system": "System",
  "settings.theme.description":
    "Choose how the application looks. System follows your OS preference.",
  "settings.region": "Default AWS Region",
  "settings.region.description":
    "The default region used when generating new architecture diagrams.",
  "settings.model": "LLM Model",
  "settings.model.description":
    "The AI model used to interpret prompts and generate architecture specifications.",
  "settings.language": "Language",
  "settings.language.description":
    "Select the display language for the application interface.",
  "settings.shortcuts": "Keyboard Shortcuts",
  "settings.shortcuts.description":
    "Reference for available keyboard shortcuts in the diagram editor.",
  "settings.shortcuts.shortcut": "Shortcut",
  "settings.shortcuts.action": "Action",

  // Prompt Input
  "prompt.placeholder": "Describe your AWS architecture...",
  "prompt.charCount": "{count} / {max} characters",
  "prompt.minLength": "Prompt must be at least 10 characters",
  "prompt.maxLength": "Prompt cannot exceed 5000 characters",

  // Export
  "export.title": "Export Diagram",
  "export.format": "Format",
  "export.options": "Options",
  "export.resolution": "Resolution (DPI)",
  "export.pageSize": "Page Size",

  // Analysis
  "analysis.title": "Architecture Analysis",
  "analysis.wellArchitected": "Well-Architected Assessment",
  "analysis.security": "Security",
  "analysis.reliability": "Reliability",
  "analysis.performance": "Performance Efficiency",
  "analysis.costOptimization": "Cost Optimization",
  "analysis.operational": "Operational Excellence",
  "analysis.sustainability": "Sustainability",
  "analysis.noGaps": "No gaps found",
  "analysis.gapsFound": "Gaps found",
  "analysis.severity.critical": "Critical",
  "analysis.severity.recommended": "Recommended",
  "analysis.severity.optional": "Optional",

  // Cost
  "cost.title": "Cost Estimation",
  "cost.total": "Total Monthly Cost",
  "cost.unavailable": "Estimate unavailable",
  "cost.noServices": "No services to estimate",
  "cost.assumptions": "Usage Assumptions",
  "cost.compute": "Compute Hours / Month",
  "cost.requests": "Requests / Month",
  "cost.dataTransfer": "Data Transfer (GB)",
  "cost.storage": "Storage (GB)",

  // Version History
  "version.title": "Version History",
  "version.autosave": "Autosave",
  "version.restore": "Restore this version",
  "version.current": "Current",
  "version.noVersions": "No versions available",

  // Errors
  "error.generic": "Something went wrong. Please try again.",
  "error.network": "Network error. Please check your connection.",
  "error.timeout": "Request timed out. Please try again.",
  "error.unauthorized": "Session expired. Please log in again.",
  "error.validation": "Please check your input and try again.",
  "error.notFound": "Resource not found.",
  "error.fileTooLarge": "File exceeds the maximum allowed size of 10 MB.",
  "error.invalidFormat": "Unsupported file format.",
  "error.generationFailed":
    "Diagram generation failed. Please rephrase your prompt.",
  "error.exportFailed": "Export failed. Please try again.",
  "error.saveFailed": "Save failed. Changes are preserved locally.",
  "error.offlineQueue":
    "You are offline. Changes will sync when connected.",

  // Tooltips
  "tooltip.generate": "Generate architecture diagram from prompt",
  "tooltip.export": "Export diagram in multiple formats",
  "tooltip.zoomIn": "Zoom in",
  "tooltip.zoomOut": "Zoom out",
  "tooltip.resetZoom": "Reset zoom",
  "tooltip.undo": "Undo last action (Ctrl+Z)",
  "tooltip.redo": "Redo last action (Ctrl+Y)",
  "tooltip.delete": "Delete selected element",
  "tooltip.darkMode": "Toggle dark mode",
  "tooltip.compare": "Compare architecture versions",
  "tooltip.voiceInput": "Voice input",

  // Templates
  "template.builtIn": "Built-in",
  "template.custom": "Custom",
  "template.useCases": "Use Cases",
  "template.saveAs": "Save as Template",
  "template.limitReached":
    "Maximum of 25 custom templates reached.",

  // Confirmation dialogs
  "confirm.delete.title": "Delete Node",
  "confirm.delete.message":
    "Are you sure you want to delete this node? This action cannot be undone.",
  "confirm.regenerate.title": "Regenerate Diagram",
  "confirm.regenerate.message":
    "This will discard the current diagram. Are you sure?",
  "confirm.restore.title": "Restore Version",
  "confirm.restore.message":
    "The current state will be autosaved before restoring.",
} as const;

export type TranslationKey = keyof typeof en;
export default en;
