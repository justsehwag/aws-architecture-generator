/**
 * French translations.
 */
const fr = {
  // Navigation
  "nav.dashboard": "Tableau de bord",
  "nav.create": "Créer un diagramme",
  "nav.templates": "Modèles",
  "nav.settings": "Paramètres",
  "nav.logout": "Déconnexion",
  "nav.login": "Connexion",

  // Actions
  "action.generate": "Générer",
  "action.export": "Exporter",
  "action.import": "Importer",
  "action.save": "Enregistrer",
  "action.delete": "Supprimer",
  "action.undo": "Annuler",
  "action.redo": "Rétablir",
  "action.cancel": "Annuler",
  "action.confirm": "Confirmer",
  "action.retry": "Réessayer",
  "action.close": "Fermer",
  "action.search": "Rechercher",
  "action.filter": "Filtrer",
  "action.clear": "Effacer",
  "action.copy": "Copier",
  "action.download": "Télécharger",
  "action.upload": "Téléverser",
  "action.compare": "Comparer",
  "action.restore": "Restaurer",

  // Status
  "status.loading": "Chargement",
  "status.generating": "Génération en cours",
  "status.ready": "Prêt",
  "status.error": "Erreur",
  "status.offline": "Hors ligne",
  "status.saving": "Enregistrement",
  "status.saved": "Enregistré",
  "status.syncing": "Synchronisation",
  "status.analyzing": "Analyse en cours",

  // Labels
  "label.architecture": "Architecture",
  "label.services": "Services",
  "label.connections": "Connexions",
  "label.cost": "Coût",
  "label.analysis": "Analyse",
  "label.recommendations": "Recommandations",
  "label.description": "Description",
  "label.name": "Nom",
  "label.region": "Région",
  "label.version": "Version",
  "label.versions": "Versions",
  "label.template": "Modèle",
  "label.category": "Catégorie",
  "label.total": "Total",
  "label.monthly": "Mensuel",
  "label.perMonth": "par mois",

  // Page Titles
  "page.dashboard.title": "Tableau de bord",
  "page.dashboard.subtitle": "Votre espace de travail d'architecture",
  "page.create.title": "Créer un diagramme",
  "page.create.subtitle":
    "Décrivez votre architecture AWS en langage courant",
  "page.templates.title": "Modèles",
  "page.templates.subtitle":
    "Parcourez et utilisez les modèles d'architecture",
  "page.settings.title": "Paramètres",
  "page.settings.subtitle": "Gérez vos préférences d'application",
  "page.diagram.title": "Visualiseur de diagramme",

  // Settings
  "settings.appearance": "Apparence",
  "settings.theme": "Thème",
  "settings.theme.light": "Clair",
  "settings.theme.dark": "Sombre",
  "settings.theme.system": "Système",
  "settings.theme.description":
    "Choisissez l'apparence de l'application. Système suit les préférences du système d'exploitation.",
  "settings.region": "Région AWS par défaut",
  "settings.region.description":
    "La région par défaut pour la génération de nouveaux diagrammes d'architecture.",
  "settings.model": "Modèle IA",
  "settings.model.description":
    "Le modèle IA utilisé pour interpréter les descriptions et générer les spécifications d'architecture.",
  "settings.language": "Langue",
  "settings.language.description":
    "Sélectionnez la langue d'affichage de l'interface de l'application.",
  "settings.shortcuts": "Raccourcis clavier",
  "settings.shortcuts.description":
    "Référence des raccourcis clavier disponibles dans l'éditeur de diagramme.",
  "settings.shortcuts.shortcut": "Raccourci",
  "settings.shortcuts.action": "Action",

  // Prompt Input
  "prompt.placeholder": "Décrivez votre architecture AWS...",
  "prompt.charCount": "{count} / {max} caractères",
  "prompt.minLength": "La description doit contenir au moins 10 caractères",
  "prompt.maxLength": "La description ne peut pas dépasser 5000 caractères",

  // Export
  "export.title": "Exporter le diagramme",
  "export.format": "Format",
  "export.options": "Options",
  "export.resolution": "Résolution (DPI)",
  "export.pageSize": "Taille de page",

  // Analysis
  "analysis.title": "Analyse d'architecture",
  "analysis.wellArchitected": "Évaluation Well-Architected",
  "analysis.security": "Sécurité",
  "analysis.reliability": "Fiabilité",
  "analysis.performance": "Efficacité des performances",
  "analysis.costOptimization": "Optimisation des coûts",
  "analysis.operational": "Excellence opérationnelle",
  "analysis.sustainability": "Durabilité",
  "analysis.noGaps": "Aucune lacune trouvée",
  "analysis.gapsFound": "Lacunes trouvées",
  "analysis.severity.critical": "Critique",
  "analysis.severity.recommended": "Recommandé",
  "analysis.severity.optional": "Facultatif",

  // Cost
  "cost.title": "Estimation des coûts",
  "cost.total": "Coût mensuel total",
  "cost.unavailable": "Estimation non disponible",
  "cost.noServices": "Aucun service à estimer",
  "cost.assumptions": "Hypothèses d'utilisation",
  "cost.compute": "Heures de calcul / mois",
  "cost.requests": "Requêtes / mois",
  "cost.dataTransfer": "Transfert de données (Go)",
  "cost.storage": "Stockage (Go)",

  // Version History
  "version.title": "Historique des versions",
  "version.autosave": "Sauvegarde automatique",
  "version.restore": "Restaurer cette version",
  "version.current": "Actuel",
  "version.noVersions": "Aucune version disponible",

  // Errors
  "error.generic":
    "Une erreur s'est produite. Veuillez réessayer.",
  "error.network":
    "Erreur réseau. Veuillez vérifier votre connexion.",
  "error.timeout":
    "Délai d'attente dépassé. Veuillez réessayer.",
  "error.unauthorized":
    "Session expirée. Veuillez vous reconnecter.",
  "error.validation":
    "Veuillez vérifier votre saisie et réessayer.",
  "error.notFound": "Ressource introuvable.",
  "error.fileTooLarge":
    "Le fichier dépasse la taille maximale autorisée de 10 Mo.",
  "error.invalidFormat": "Format de fichier non pris en charge.",
  "error.generationFailed":
    "La génération du diagramme a échoué. Veuillez reformuler votre description.",
  "error.exportFailed": "L'exportation a échoué. Veuillez réessayer.",
  "error.saveFailed":
    "La sauvegarde a échoué. Les modifications sont conservées localement.",
  "error.offlineQueue":
    "Vous êtes hors ligne. Les modifications seront synchronisées à la reconnexion.",

  // Tooltips
  "tooltip.generate": "Générer un diagramme d'architecture à partir de la description",
  "tooltip.export": "Exporter le diagramme dans plusieurs formats",
  "tooltip.zoomIn": "Zoom avant",
  "tooltip.zoomOut": "Zoom arrière",
  "tooltip.resetZoom": "Réinitialiser le zoom",
  "tooltip.undo": "Annuler la dernière action (Ctrl+Z)",
  "tooltip.redo": "Rétablir la dernière action (Ctrl+Y)",
  "tooltip.delete": "Supprimer l'élément sélectionné",
  "tooltip.darkMode": "Basculer le mode sombre",
  "tooltip.compare": "Comparer les versions d'architecture",
  "tooltip.voiceInput": "Saisie vocale",

  // Templates
  "template.builtIn": "Intégrés",
  "template.custom": "Personnalisés",
  "template.useCases": "Cas d'utilisation",
  "template.saveAs": "Enregistrer comme modèle",
  "template.limitReached":
    "Maximum de 25 modèles personnalisés atteint.",

  // Confirmation dialogs
  "confirm.delete.title": "Supprimer le nœud",
  "confirm.delete.message":
    "Êtes-vous sûr de vouloir supprimer ce nœud ? Cette action est irréversible.",
  "confirm.regenerate.title": "Régénérer le diagramme",
  "confirm.regenerate.message":
    "Le diagramme actuel sera supprimé. Êtes-vous sûr ?",
  "confirm.restore.title": "Restaurer la version",
  "confirm.restore.message":
    "L'état actuel sera sauvegardé automatiquement avant la restauration.",
} as const;

export default fr;
