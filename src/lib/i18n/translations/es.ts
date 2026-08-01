/**
 * Spanish translations.
 */
const es = {
  // Navigation
  "nav.dashboard": "Panel",
  "nav.create": "Crear diagrama",
  "nav.templates": "Plantillas",
  "nav.settings": "Configuración",
  "nav.logout": "Cerrar sesión",
  "nav.login": "Iniciar sesión",

  // Actions
  "action.generate": "Generar",
  "action.export": "Exportar",
  "action.import": "Importar",
  "action.save": "Guardar",
  "action.delete": "Eliminar",
  "action.undo": "Deshacer",
  "action.redo": "Rehacer",
  "action.cancel": "Cancelar",
  "action.confirm": "Confirmar",
  "action.retry": "Reintentar",
  "action.close": "Cerrar",
  "action.search": "Buscar",
  "action.filter": "Filtrar",
  "action.clear": "Limpiar",
  "action.copy": "Copiar",
  "action.download": "Descargar",
  "action.upload": "Subir",
  "action.compare": "Comparar",
  "action.restore": "Restaurar",

  // Status
  "status.loading": "Cargando",
  "status.generating": "Generando",
  "status.ready": "Listo",
  "status.error": "Error",
  "status.offline": "Sin conexión",
  "status.saving": "Guardando",
  "status.saved": "Guardado",
  "status.syncing": "Sincronizando",
  "status.analyzing": "Analizando",

  // Labels
  "label.architecture": "Arquitectura",
  "label.services": "Servicios",
  "label.connections": "Conexiones",
  "label.cost": "Costo",
  "label.analysis": "Análisis",
  "label.recommendations": "Recomendaciones",
  "label.description": "Descripción",
  "label.name": "Nombre",
  "label.region": "Región",
  "label.version": "Versión",
  "label.versions": "Versiones",
  "label.template": "Plantilla",
  "label.category": "Categoría",
  "label.total": "Total",
  "label.monthly": "Mensual",
  "label.perMonth": "por mes",

  // Page Titles
  "page.dashboard.title": "Panel",
  "page.dashboard.subtitle": "Su espacio de trabajo de arquitectura",
  "page.create.title": "Crear diagrama",
  "page.create.subtitle":
    "Describa su arquitectura AWS en lenguaje sencillo",
  "page.templates.title": "Plantillas",
  "page.templates.subtitle":
    "Explore y utilice plantillas de arquitectura",
  "page.settings.title": "Configuración",
  "page.settings.subtitle": "Gestione las preferencias de la aplicación",
  "page.diagram.title": "Visor de diagramas",

  // Settings
  "settings.appearance": "Apariencia",
  "settings.theme": "Tema",
  "settings.theme.light": "Claro",
  "settings.theme.dark": "Oscuro",
  "settings.theme.system": "Sistema",
  "settings.theme.description":
    "Elija la apariencia de la aplicación. Sistema sigue las preferencias del sistema operativo.",
  "settings.region": "Región AWS predeterminada",
  "settings.region.description":
    "La región predeterminada para generar nuevos diagramas de arquitectura.",
  "settings.model": "Modelo IA",
  "settings.model.description":
    "El modelo de IA utilizado para interpretar las descripciones y generar especificaciones de arquitectura.",
  "settings.language": "Idioma",
  "settings.language.description":
    "Seleccione el idioma de la interfaz de la aplicación.",
  "settings.shortcuts": "Atajos de teclado",
  "settings.shortcuts.description":
    "Referencia de atajos de teclado disponibles en el editor de diagramas.",
  "settings.shortcuts.shortcut": "Atajo",
  "settings.shortcuts.action": "Acción",

  // Prompt Input
  "prompt.placeholder": "Describa su arquitectura AWS...",
  "prompt.charCount": "{count} / {max} caracteres",
  "prompt.minLength": "La descripción debe tener al menos 10 caracteres",
  "prompt.maxLength": "La descripción no puede exceder los 5000 caracteres",

  // Export
  "export.title": "Exportar diagrama",
  "export.format": "Formato",
  "export.options": "Opciones",
  "export.resolution": "Resolución (DPI)",
  "export.pageSize": "Tamaño de página",

  // Analysis
  "analysis.title": "Análisis de arquitectura",
  "analysis.wellArchitected": "Evaluación Well-Architected",
  "analysis.security": "Seguridad",
  "analysis.reliability": "Fiabilidad",
  "analysis.performance": "Eficiencia de rendimiento",
  "analysis.costOptimization": "Optimización de costos",
  "analysis.operational": "Excelencia operativa",
  "analysis.sustainability": "Sostenibilidad",
  "analysis.noGaps": "No se encontraron brechas",
  "analysis.gapsFound": "Brechas encontradas",
  "analysis.severity.critical": "Crítico",
  "analysis.severity.recommended": "Recomendado",
  "analysis.severity.optional": "Opcional",

  // Cost
  "cost.title": "Estimación de costos",
  "cost.total": "Costo mensual total",
  "cost.unavailable": "Estimación no disponible",
  "cost.noServices": "Sin servicios para estimar",
  "cost.assumptions": "Suposiciones de uso",
  "cost.compute": "Horas de cómputo / mes",
  "cost.requests": "Solicitudes / mes",
  "cost.dataTransfer": "Transferencia de datos (GB)",
  "cost.storage": "Almacenamiento (GB)",

  // Version History
  "version.title": "Historial de versiones",
  "version.autosave": "Guardado automático",
  "version.restore": "Restaurar esta versión",
  "version.current": "Actual",
  "version.noVersions": "No hay versiones disponibles",

  // Errors
  "error.generic": "Algo salió mal. Por favor, inténtelo de nuevo.",
  "error.network":
    "Error de red. Por favor, verifique su conexión.",
  "error.timeout":
    "Tiempo de espera agotado. Por favor, inténtelo de nuevo.",
  "error.unauthorized":
    "Sesión expirada. Por favor, inicie sesión nuevamente.",
  "error.validation":
    "Por favor, verifique su entrada e inténtelo de nuevo.",
  "error.notFound": "Recurso no encontrado.",
  "error.fileTooLarge":
    "El archivo excede el tamaño máximo permitido de 10 MB.",
  "error.invalidFormat": "Formato de archivo no compatible.",
  "error.generationFailed":
    "La generación del diagrama falló. Por favor, reformule su descripción.",
  "error.exportFailed":
    "La exportación falló. Por favor, inténtelo de nuevo.",
  "error.saveFailed":
    "Error al guardar. Los cambios se conservan localmente.",
  "error.offlineQueue":
    "Está sin conexión. Los cambios se sincronizarán al reconectarse.",

  // Tooltips
  "tooltip.generate": "Generar diagrama de arquitectura a partir de la descripción",
  "tooltip.export": "Exportar diagrama en múltiples formatos",
  "tooltip.zoomIn": "Acercar",
  "tooltip.zoomOut": "Alejar",
  "tooltip.resetZoom": "Restablecer zoom",
  "tooltip.undo": "Deshacer última acción (Ctrl+Z)",
  "tooltip.redo": "Rehacer última acción (Ctrl+Y)",
  "tooltip.delete": "Eliminar elemento seleccionado",
  "tooltip.darkMode": "Alternar modo oscuro",
  "tooltip.compare": "Comparar versiones de arquitectura",
  "tooltip.voiceInput": "Entrada de voz",

  // Templates
  "template.builtIn": "Integradas",
  "template.custom": "Personalizadas",
  "template.useCases": "Casos de uso",
  "template.saveAs": "Guardar como plantilla",
  "template.limitReached":
    "Se alcanzó el máximo de 25 plantillas personalizadas.",

  // Confirmation dialogs
  "confirm.delete.title": "Eliminar nodo",
  "confirm.delete.message":
    "¿Está seguro de que desea eliminar este nodo? Esta acción no se puede deshacer.",
  "confirm.regenerate.title": "Regenerar diagrama",
  "confirm.regenerate.message":
    "El diagrama actual será descartado. ¿Está seguro?",
  "confirm.restore.title": "Restaurar versión",
  "confirm.restore.message":
    "El estado actual se guardará automáticamente antes de la restauración.",
} as const;

export default es;
