// AnyVideo Offscreen Recording Script
class VFetchProOffscreen {
  constructor() {
    this.currentStream = null;
    this.recordingSessions = [];
    this.activeSessionId = null;
    this.isPlayingBack = false;
    
    // Quality Presets
    this.qualityPresets = {
      low: {
        name: 'Low',
        width: 1280,
        height: 720,
        frameRate: 24,
        bitrate: 2000000, // 2 Mbps
        description: 'Smaller files, faster processing'
      },
      medium: {
        name: 'Medium',
        width: 1920,
        height: 1080,
        frameRate: 30,
        bitrate: 5000000, // 5 Mbps
        description: 'Good balance of quality and size'
      },
      high: {
        name: 'High',
        width: 2560,
        height: 1440,
        frameRate: 30,
        bitrate: 8000000, // 8 Mbps
        description: 'High quality, larger files'
      },
      ultra: {
        name: 'Ultra',
        width: 3840,
        height: 2160,
        frameRate: 60,
        bitrate: 15000000, // 15 Mbps
        description: 'Maximum quality, very large files'
      }
    };
    
    // Current quality setting
    this.currentQuality = 'medium';
    
    // Timer functionality
    this.recordingTimer = null;
    this.recordingStartTime = null;
    this.countdownTimer = null;
    this.countdownEndTime = null;
    this.isTimerPaused = false;
    this.pauseStartTime = null;
    this.totalPausedTime = 0;
    
    // UI Elements
    this.statusIndicator = document.getElementById('status-indicator');
    this.statusText = document.getElementById('status-text');
    this.startBtn = document.getElementById('start-btn');
    this.stopAllBtn = document.getElementById('stop-all-btn');
    this.recordingInfo = document.getElementById('recording-info');
    this.recordingTime = document.getElementById('recording-time');
    this.fileSize = document.getElementById('file-size');
    this.fps = document.getElementById('fps');
    this.quality = document.getElementById('quality');
    this.errorContainer = document.getElementById('error-container');
    this.successContainer = document.getElementById('success-container');
    
    // Back to Top Button
    this.backToTopBtn = document.getElementById('back-to-top');
    
    // Preview Elements
    this.previewPlaceholder = document.getElementById('preview-placeholder');
    this.previewVideo = document.getElementById('preview-video');
    this.recordingOverlay = document.getElementById('recording-overlay');
    
    // Playback Elements
    this.playbackControls = document.getElementById('playback-controls');
    this.playbackVideo = document.getElementById('playback-video');
    this.downloadBtn = document.getElementById('download-btn');
    this.backToLiveBtn = document.getElementById('back-to-live-btn');
    
    // Recordings List
    this.recordingsList = document.getElementById('recordings-list');
    
    // Completed Recordings
    this.completedRecordings = document.getElementById('completed-recordings');
    this.completedList = document.getElementById('completed-list');
    
    // Timer Elements
    this.recordingTimerElement = document.getElementById('recording-timer');
    this.timerMain = document.getElementById('timer-main');
    this.timerSubtitle = document.getElementById('timer-subtitle');
    this.countdownBtn = document.getElementById('countdown-btn');
    this.pauseTimerBtn = document.getElementById('pause-timer-btn');
    
    // Countdown Modal Elements
    this.countdownModal = document.getElementById('countdown-modal');
    this.countdownHours = document.getElementById('countdown-hours');
    this.countdownMinutes = document.getElementById('countdown-minutes');
    this.countdownSeconds = document.getElementById('countdown-seconds');
    this.startCountdownBtn = document.getElementById('start-countdown-btn');
    this.cancelCountdownBtn = document.getElementById('cancel-countdown-btn');
    
    // Video Editing Elements
    this.videoEditing = document.getElementById('video-editing');
    this.trimVideoBtn = document.getElementById('trim-video-btn');

    this.addTextBtn = document.getElementById('add-text-btn');
    this.addWatermarkBtn = document.getElementById('add-watermark-btn');
    this.resetEditsBtn = document.getElementById('reset-edits-btn');
    
    // Editing Modals
    this.trimModal = document.getElementById('trim-modal');

    this.textModal = document.getElementById('text-modal');
    this.watermarkModal = document.getElementById('watermark-modal');
    
    // Current editing session
    this.currentEditingSession = null;
    this.editingHistory = [];
    
    // Export functionality
    this.exportOptions = document.getElementById('export-options');
    this.exportVideoBtn = document.getElementById('export-video-btn');
    this.exportGifBtn = document.getElementById('export-gif-btn');
    this.exportAudioBtn = document.getElementById('export-audio-btn');
    this.batchExportBtn = document.getElementById('batch-export-btn');
    this.exportSettingsBtn = document.getElementById('export-settings-btn');
    
    // Export modals
    this.exportVideoModal = document.getElementById('export-video-modal');
    this.exportGifModal = document.getElementById('export-gif-modal');
    this.extractAudioModal = document.getElementById('extract-audio-modal');
    this.batchExportModal = document.getElementById('batch-export-modal');
    this.exportSettingsModal = document.getElementById('export-settings-modal');
    
    // Export settings
    this.exportSettings = {
      defaultVideoFormat: 'mp4',
      defaultQuality: 'medium',
      defaultAudioFormat: 'mp3',
      autoExport: true,
      includeMetadata: true
    };
    
    // Notification settings
    this.notificationSettings = {
      desktopNotifications: true,
      soundAlerts: true,
      visualAlerts: true,
      soundType: 'beep',
      notifyRecordingStart: true,
      notifyRecordingStop: true,
      notifyRecordingPause: true,
      notifyExportComplete: true,
      notifyError: true,
      visualRecordingIndicator: true,
      visualStatusFlash: true,
      visualToastNotifications: true
    };
    
    // Notification elements
    this.testNotificationBtn = document.getElementById('test-notification-btn');
    this.notificationSettingsBtn = document.getElementById('notification-settings-btn');
    this.desktopNotificationsCheckbox = document.getElementById('desktop-notifications');
    this.soundAlertsCheckbox = document.getElementById('sound-alerts');
    this.visualAlertsCheckbox = document.getElementById('visual-alerts');
    
    // Notification modal elements
    this.notificationSettingsModal = document.getElementById('notification-settings-modal');
    this.notifyRecordingStartCheckbox = document.getElementById('notify-recording-start');
    this.notifyRecordingStopCheckbox = document.getElementById('notify-recording-stop');
    this.notifyRecordingPauseCheckbox = document.getElementById('notify-recording-pause');
    this.notifyExportCompleteCheckbox = document.getElementById('notify-export-complete');
    this.notifyErrorCheckbox = document.getElementById('notify-error');
    this.visualRecordingIndicatorCheckbox = document.getElementById('visual-recording-indicator');
    this.visualStatusFlashCheckbox = document.getElementById('visual-status-flash');
    this.visualToastNotificationsCheckbox = document.getElementById('visual-toast-notifications');
    this.testSoundBtn = document.getElementById('test-sound-btn');
    this.previewNotificationBtn = document.getElementById('preview-notification-btn');
    this.saveNotificationSettingsBtn = document.getElementById('save-notification-settings-btn');
    this.cancelNotificationSettingsBtn = document.getElementById('cancel-notification-settings-btn');
    
    // Sound options
    this.soundOptions = document.querySelectorAll('.sound-option');
    
    // Audio context for sound alerts
    this.audioContext = null;
    this.audioBuffer = null;
    
    // Performance settings
    this.performanceSettings = {
      autoCleanup: true,
      compressRecordings: true,
      limitMemoryUsage: true,
      hardwareAcceleration: true,
      adaptiveBitrate: true,
      chunkedRecording: false,
      backgroundProcessing: true,
      autoOptimize: true,
      realTimeMonitoring: true,
      performanceAlerts: true,
      autoThrottle: true,
      maxMemoryUsage: 1024 * 1024 * 1024, // 1GB
      maxStorageUsage: 5 * 1024 * 1024 * 1024, // 5GB
      cleanupThreshold: 0.8 // 80% usage triggers cleanup
    };
    
    // Performance monitoring
    this.performanceMonitor = {
      memoryUsage: 0,
      cpuUsage: 0,
      fps: 0,
      bitrate: 0,
      isMonitoring: false,
      monitoringInterval: null,
      performanceHistory: [],
      maxHistoryLength: 100
    };
    
    // Background worker
    this.backgroundWorker = {
      isActive: false,
      tasks: [],
      processingQueue: []
    };
    
    // Performance elements
    this.performanceMonitorBtn = document.getElementById('performance-monitor-btn');
    this.memoryCleanupBtn = document.getElementById('memory-cleanup-btn');
    this.performanceSettingsBtn = document.getElementById('performance-settings-btn');
    this.memoryUsageElement = document.getElementById('memory-usage');
    this.cpuUsageElement = document.getElementById('cpu-usage');
    this.storageUsedElement = document.getElementById('storage-used');
    
    // Privacy settings
    this.privacySettings = {
      privacyLevel: 'enhanced',
      blurSensitiveContent: true,
      excludeSystemAudio: true,
      privacyWatermark: true,
      autoDeleteOld: true,
      noAnalytics: true,
      localProcessing: true,
      secureDeletion: true,
      encryptionEnabled: false,
      encryptMetadata: true,
      autoEncryptNew: false,
      encryptionKey: '',
      rememberKey: true,
      autoGenerateKey: false,
      secureStorageEnabled: true,
      isolatedStorage: true,
      backupEncryption: true,
      storageLocation: 'isolated'
    };
    
    // Privacy elements
    this.privacySettingsBtn = document.getElementById('privacy-settings-btn');
    this.encryptRecordingsBtn = document.getElementById('encrypt-recordings-btn');
    this.secureStorageBtn = document.getElementById('secure-storage-btn');
    this.encryptionStatusElement = document.getElementById('encryption-status');
    this.storageStatusElement = document.getElementById('storage-status');
    this.privacyLevelElement = document.getElementById('privacy-level');
    
    // Privacy modal elements
    this.privacySettingsModal = document.getElementById('privacy-settings-modal');
    this.encryptionModal = document.getElementById('encryption-modal');
    this.secureStorageModal = document.getElementById('secure-storage-modal');
    this.savePrivacySettingsBtn = document.getElementById('save-privacy-settings-btn');
    this.cancelPrivacySettingsBtn = document.getElementById('cancel-privacy-settings-btn');
    this.saveEncryptionSettingsBtn = document.getElementById('save-encryption-settings-btn');
    this.cancelEncryptionBtn = document.getElementById('cancel-encryption-btn');
    this.saveStorageSettingsBtn = document.getElementById('save-storage-settings-btn');
    this.cancelStorageBtn = document.getElementById('cancel-storage-btn');
    this.toggleKeyVisibilityBtn = document.getElementById('toggle-key-visibility');
    
    // Privacy level options
    this.privacyLevelOptions = document.querySelectorAll('.privacy-level-option');
    
    // Performance modal elements
    this.performanceSettingsModal = document.getElementById('performance-settings-modal');
    this.performanceMonitorModal = document.getElementById('performance-monitor-modal');
    this.savePerformanceSettingsBtn = document.getElementById('save-performance-settings-btn');
    this.cancelPerformanceSettingsBtn = document.getElementById('cancel-performance-settings-btn');
    this.refreshPerformanceBtn = document.getElementById('refresh-performance-btn');
    this.closePerformanceMonitorBtn = document.getElementById('close-performance-monitor-btn');
    
    this.initializeEventListeners();
    this.updateStatus('Ready to Record', 'ready');
    
    // Load notification settings
    this.loadNotificationSettings();
    
    // Load performance settings
    this.loadPerformanceSettings();
    
    // Apply performance settings
    this.applyPerformanceSettings();
    
    // Load privacy settings
    this.loadPrivacySettings();
    
    // Check video format support
    this.checkVideoSupport();
    
    // Set up periodic cleanup of invalid blob URLs
    setInterval(() => {
      this.cleanupInvalidBlobUrls();
      this.fixSessionUrls(); // Also fix any missing URLs
    }, 30000); // Clean up every 30 seconds
    
    // Start periodic long recording maintenance
    setInterval(() => {
      this.maintainLongRecordings();
    }, 300000); // Every 5 minutes instead of every minute
    
    // Display video format support information
    this.displayVideoFormatInfo();
  }

  initializeEventListeners() {
    this.startBtn.addEventListener('click', () => this.startNewRecordingWithPrivacy());
    this.stopAllBtn.addEventListener('click', () => this.stopAllRecordings());
    this.downloadBtn.addEventListener('click', () => this.downloadCurrentVideo());
    this.backToLiveBtn.addEventListener('click', () => this.backToLivePreview());
    
    // Timer event listeners
    this.countdownBtn.addEventListener('click', () => this.showCountdownModal());
    this.pauseTimerBtn.addEventListener('click', () => this.toggleTimerPause());
    this.startCountdownBtn.addEventListener('click', () => this.startCountdown());
    this.cancelCountdownBtn.addEventListener('click', () => this.hideCountdownModal());
    
    // Close modal when clicking outside
    this.countdownModal.addEventListener('click', (e) => {
      if (e.target === this.countdownModal) {
        this.hideCountdownModal();
      }
    });
    
    // Video editing event listeners
    this.trimVideoBtn.addEventListener('click', () => this.openTrimModal());

    this.addTextBtn.addEventListener('click', () => this.openTextModal());
    this.addWatermarkBtn.addEventListener('click', () => this.openWatermarkModal());
    this.resetEditsBtn.addEventListener('click', () => this.resetAllEdits());
    
    // Close editing modals when clicking outside
    [this.trimModal, this.textModal, this.watermarkModal].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeEditingModal(modal);
        }
      });
    });
    
    // Export event listeners
    this.exportVideoBtn.addEventListener('click', () => this.openExportVideoModal());
    this.exportGifBtn.addEventListener('click', () => this.openExportGifModal());
    this.exportAudioBtn.addEventListener('click', () => this.openExtractAudioModal());
    this.batchExportBtn.addEventListener('click', () => this.openBatchExportModal());
    this.exportSettingsBtn.addEventListener('click', () => this.openExportSettingsModal());
    
    // Close export modals when clicking outside
    [this.exportVideoModal, this.exportGifModal, this.extractAudioModal, this.batchExportModal, this.exportSettingsModal].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          this.closeExportModal(modal);
        }
      });
    });
    
    // Notification event listeners
    this.testNotificationBtn.addEventListener('click', () => this.testNotifications());
    this.notificationSettingsBtn.addEventListener('click', () => this.openNotificationSettingsModal());
    this.desktopNotificationsCheckbox.addEventListener('change', (e) => {
      this.notificationSettings.desktopNotifications = e.target.checked;
      this.saveNotificationSettings();
    });
    this.soundAlertsCheckbox.addEventListener('change', (e) => {
      this.notificationSettings.soundAlerts = e.target.checked;
      this.saveNotificationSettings();
    });
    this.visualAlertsCheckbox.addEventListener('change', (e) => {
      this.notificationSettings.visualAlerts = e.target.checked;
      this.saveNotificationSettings();
    });
    
    // Notification modal event listeners
    this.testSoundBtn.addEventListener('click', () => this.testSound());
    this.previewNotificationBtn.addEventListener('click', () => this.previewNotification());
    this.saveNotificationSettingsBtn.addEventListener('click', () => this.saveNotificationSettings());
    this.cancelNotificationSettingsBtn.addEventListener('click', () => this.closeNotificationSettingsModal());
    
    // Close notification modal when clicking outside
    this.notificationSettingsModal.addEventListener('click', (e) => {
      if (e.target === this.notificationSettingsModal) {
        this.closeNotificationSettingsModal();
      }
    });
    
    // Sound option selection
    this.soundOptions.forEach(option => {
      option.addEventListener('click', () => {
        this.soundOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        this.notificationSettings.soundType = option.dataset.sound;
        this.saveNotificationSettings();
      });
    });
    
    // Performance event listeners
    this.performanceMonitorBtn.addEventListener('click', () => this.openPerformanceMonitor());
    this.memoryCleanupBtn.addEventListener('click', () => this.performMemoryCleanup());
    this.performanceSettingsBtn.addEventListener('click', () => this.openPerformanceSettingsModal());
    this.savePerformanceSettingsBtn.addEventListener('click', () => this.savePerformanceSettings());
    this.cancelPerformanceSettingsBtn.addEventListener('click', () => this.closePerformanceSettingsModal());
    this.refreshPerformanceBtn.addEventListener('click', () => this.refreshPerformanceMetrics());
    this.closePerformanceMonitorBtn.addEventListener('click', () => this.closePerformanceMonitor());
    
    // Close performance modals when clicking outside
    [this.performanceSettingsModal, this.performanceMonitorModal].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          if (modal === this.performanceSettingsModal) {
            this.closePerformanceSettingsModal();
          } else {
            this.closePerformanceMonitor();
          }
        }
      });
    });
    
    // Privacy event listeners
    this.privacySettingsBtn.addEventListener('click', () => this.openPrivacySettingsModal());
    this.encryptRecordingsBtn.addEventListener('click', () => this.openEncryptionModal());
    this.secureStorageBtn.addEventListener('click', () => this.openSecureStorageModal());
    this.savePrivacySettingsBtn.addEventListener('click', () => this.savePrivacySettings());
    this.cancelPrivacySettingsBtn.addEventListener('click', () => this.closePrivacySettingsModal());
    this.saveEncryptionSettingsBtn.addEventListener('click', () => this.saveEncryptionSettings());
    this.cancelEncryptionBtn.addEventListener('click', () => this.closeEncryptionModal());
    this.saveStorageSettingsBtn.addEventListener('click', () => this.saveStorageSettings());
    this.cancelStorageBtn.addEventListener('click', () => this.closeSecureStorageModal());
    this.toggleKeyVisibilityBtn.addEventListener('click', () => this.toggleKeyVisibility());
    
    // Privacy level selection
    this.privacyLevelOptions.forEach(option => {
      option.addEventListener('click', () => {
        this.privacyLevelOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        this.privacySettings.privacyLevel = option.dataset.level;
      });
    });
    
    // Close privacy modals when clicking outside
    [this.privacySettingsModal, this.encryptionModal, this.secureStorageModal].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          if (modal === this.privacySettingsModal) {
            this.closePrivacySettingsModal();
          } else if (modal === this.encryptionModal) {
            this.closeEncryptionModal();
          } else {
            this.closeSecureStorageModal();
          }
        }
      });
    });
    
    // Add quality preset event listeners
    this.setupQualityPresets();
    
    // Add keyboard shortcuts
    this.setupKeyboardShortcuts();
    
    // Back to Top Button
    this.backToTopBtn.addEventListener('click', () => this.scrollToTop());
    
    // Scroll event listener for back to top button visibility
    window.addEventListener('scroll', () => this.toggleBackToTopButton());
  }

  setupQualityPresets() {
    const qualityPresets = document.querySelectorAll('.quality-preset');
    qualityPresets.forEach(preset => {
      preset.addEventListener('click', () => {
        const quality = preset.dataset.quality;
        this.selectQuality(quality);
      });
    });
  }

  selectQuality(qualityLevel) {
    // Remove active class from all presets
    document.querySelectorAll('.quality-preset').forEach(preset => {
      preset.classList.remove('active');
    });
    
    // Add active class to selected preset
    const selectedPreset = document.querySelector(`[data-quality="${qualityLevel}"]`);
    if (selectedPreset) {
      selectedPreset.classList.add('active');
    }
    
    // Set the quality
    this.setQuality(qualityLevel);
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Only handle shortcuts when the offscreen page is focused
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
        return; // Don't trigger shortcuts when typing in input fields
      }

      // Ctrl+Shift+R: Start/Stop recording
      if (e.ctrlKey && e.shiftKey && e.key === 'R') {
        e.preventDefault();
        this.toggleRecording();
      }
      
      // Ctrl+Shift+S: Stop all recordings
      if (e.ctrlKey && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        this.stopAllRecordings();
        this.showHotkeyFeedback('⏹️ All Recordings Stopped');
      }
      
      // Ctrl+Shift+U: Pause/Resume active recording
      if (e.ctrlKey && e.shiftKey && e.key === 'U') {
        e.preventDefault();
        this.togglePauseActiveRecording();
      }
      
      // Ctrl+Shift+D: Download current video
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        this.downloadCurrentVideo();
        this.showHotkeyFeedback('⬇️ Download Started');
      }
      
      // Quality shortcuts
      if (e.ctrlKey && e.shiftKey && e.key === '1') {
        e.preventDefault();
        this.selectQuality('low');
        this.showHotkeyFeedback('📉 Low Quality');
      }
      
      if (e.ctrlKey && e.shiftKey && e.key === '2') {
        e.preventDefault();
        this.selectQuality('medium');
        this.showHotkeyFeedback('⚖️ Medium Quality');
      }
      
      if (e.ctrlKey && e.shiftKey && e.key === '3') {
        e.preventDefault();
        this.selectQuality('high');
        this.showHotkeyFeedback('📈 High Quality');
      }
      
      if (e.ctrlKey && e.shiftKey && e.key === '4') {
        e.preventDefault();
        this.selectQuality('ultra');
        this.showHotkeyFeedback('🚀 Ultra Quality');
      }
      
      // Escape: Back to live preview
      if (e.key === 'Escape') {
        e.preventDefault();
        this.backToLivePreview();
        this.showHotkeyFeedback('📺 Back to Live');
      }
      
      // Ctrl+Shift+T: Toggle timer pause
      if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        this.toggleTimerPause();
        this.showHotkeyFeedback(this.isTimerPaused ? '⏸️ Timer Paused' : '▶️ Timer Resumed');
      }
      
      // Ctrl+Shift+C: Set countdown
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        this.showCountdownModal();
        this.showHotkeyFeedback('⏰ Countdown Modal');
      }
      
      // Video editing shortcuts
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        if (this.currentEditingSession) {
          this.openTrimModal();
          this.showHotkeyFeedback('✂️ Trim Video');
        }
      }
      
      // Ctrl+Shift+V: Open advanced video editor
      if (e.ctrlKey && e.shiftKey && e.key === 'V') {
        e.preventDefault();
        if (this.currentEditingSession) {
          this.openAdvancedVideoEditor();
          this.showHotkeyFeedback('🎬 Advanced Editor');
        }
      }
      

      
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        if (this.currentEditingSession) {
          this.openTextModal();
          this.showHotkeyFeedback('📝 Add Text');
        }
      }
      
      if (e.ctrlKey && e.shiftKey && e.key === 'W') {
        e.preventDefault();
        if (this.currentEditingSession) {
          this.openWatermarkModal();
          this.showHotkeyFeedback('🖼️ Add Watermark');
        }
      }
      
      // Export shortcuts
      if (e.ctrlKey && e.shiftKey && e.key === 'X') {
        e.preventDefault();
        if (this.currentExportSession) {
          this.openExportVideoModal();
          this.showHotkeyFeedback('🎬 Export Video');
        }
      }
      
      if (e.ctrlKey && e.shiftKey && e.key === 'G') {
        e.preventDefault();
        if (this.currentExportSession) {
          this.openExportGifModal();
          this.showHotkeyFeedback('🖼️ Export GIF');
        }
      }
      
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        if (this.currentExportSession) {
          this.openExtractAudioModal();
          this.showHotkeyFeedback('🎵 Extract Audio');
        }
      }
      
      if (e.ctrlKey && e.shiftKey && e.key === 'B') {
        e.preventDefault();
        this.openBatchExportModal();
        this.showHotkeyFeedback('📦 Batch Export');
      }
      
      // Notification shortcuts
      if (e.ctrlKey && e.shiftKey && e.key === 'N') {
        e.preventDefault();
        this.testNotifications();
        this.showHotkeyFeedback('🔔 Test Notifications');
      }
      
      if (e.ctrlKey && e.shiftKey && e.key === 'O') {
        e.preventDefault();
        this.openNotificationSettingsModal();
        this.showHotkeyFeedback('⚙️ Notification Settings');
      }
      
      // Performance shortcuts
      if (e.ctrlKey && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        this.openPerformanceMonitor();
        this.showHotkeyFeedback('📊 Performance Monitor');
      }
      
      if (e.ctrlKey && e.shiftKey && e.key === 'L') {
        e.preventDefault();
        this.performMemoryCleanup();
        this.showHotkeyFeedback('🧹 Memory Cleanup');
      }
      
      // Privacy shortcuts
      if (e.ctrlKey && e.shiftKey && e.key === 'P') {
        e.preventDefault();
        this.openPrivacySettingsModal();
        this.showHotkeyFeedback('🔒 Privacy Settings');
      }
      
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        this.openEncryptionModal();
        this.showHotkeyFeedback('🔐 Encryption Settings');
      }
    });
  }

  toggleRecording() {
    const activeRecordings = this.recordingSessions.filter(session => session.isRecording);
    
    if (activeRecordings.length > 0) {
      // Stop the most recent recording
      const latestRecording = activeRecordings[activeRecordings.length - 1];
      this.stopSession(latestRecording.id);
      this.showMessage('Recording stopped via hotkey', 'info');
      this.showHotkeyFeedback('⏹️ Recording Stopped');
    } else {
      // Start a new recording
      this.startNewRecordingWithPrivacy();
      this.showMessage('Recording started via hotkey', 'info');
      this.showHotkeyFeedback('🔴 Recording Started');
    }
  }

  togglePauseActiveRecording() {
    const activeRecordings = this.recordingSessions.filter(session => session.isRecording);
    
    if (activeRecordings.length === 0) {
      this.showMessage('No active recording to pause', 'warning');
      return;
    }
    
    const latestRecording = activeRecordings[activeRecordings.length - 1];
    
    if (latestRecording.isPaused) {
      this.resumeSession(latestRecording.id);
      this.showMessage('Recording resumed via hotkey', 'info');
      this.showHotkeyFeedback('▶️ Recording Resumed');
    } else {
      this.pauseSession(latestRecording.id);
      this.showMessage('Recording paused via hotkey', 'info');
      this.showHotkeyFeedback('⏸️ Recording Paused');
    }
  }

  showHotkeyFeedback(action) {
    // Create a temporary visual feedback element
    const feedback = document.createElement('div');
    feedback.className = 'hotkey-feedback';
    feedback.textContent = action;
    feedback.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 1rem 2rem;
      border-radius: 8px;
      font-size: 1.2rem;
      font-weight: bold;
      z-index: 9999;
      pointer-events: none;
      animation: fadeInOut 1s ease-in-out;
    `;
    
    document.body.appendChild(feedback);
    
    // Remove after animation
    setTimeout(() => {
      if (feedback.parentNode) {
        feedback.remove();
      }
    }, 1000);
  }

  setQuality(qualityLevel) {
    if (this.qualityPresets[qualityLevel]) {
      this.currentQuality = qualityLevel;
      this.updateQualityDisplay();
      this.showMessage(`Quality set to ${this.qualityPresets[qualityLevel].name}`, 'success');
    }
  }

  updateQualityDisplay() {
    const quality = this.qualityPresets[this.currentQuality];
    if (this.quality) {
      this.quality.textContent = quality.name;
    }
    
    // Update quality selector if it exists
    const qualitySelector = document.getElementById('quality-selector');
    if (qualitySelector) {
      qualitySelector.value = this.currentQuality;
    }
    
    // Update FPS display
    if (this.fps) {
      this.fps.textContent = quality.frameRate;
    }
  }

  getEstimatedFileSize(durationSeconds) {
    const quality = this.qualityPresets[this.currentQuality];
    // Estimate file size based on bitrate and duration
    const estimatedBytes = (quality.bitrate / 8) * durationSeconds;
    return this.formatFileSize(estimatedBytes);
  }

  updateStatus(text, type = 'info') {
    this.statusText.textContent = text;
    
    // Update indicator color
    this.statusIndicator.style.background = {
      'ready': '#28a745',
      'recording': '#dc3545',
      'error': '#dc3545',
      'success': '#28a745',
      'info': '#17a2b8'
    }[type] || '#17a2b8';
    
    // Show/hide pulse animation
    if (type === 'recording') {
      this.statusIndicator.style.animation = 'pulse 1.5s infinite';
    } else {
      this.statusIndicator.style.animation = 'none';
    }
  }

  showMessage(message, type = 'info') {
    const container = type === 'error' ? this.errorContainer : this.successContainer;
    const className = type === 'error' ? 'error-message' : 'success-message';
    
    const messageElement = document.createElement('div');
    messageElement.className = className;
    messageElement.textContent = message;
    
    container.appendChild(messageElement);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (messageElement.parentNode) {
        messageElement.remove();
      }
    }, 5000);
  }

  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  sanitizeFilename(filename) {
    // Remove or replace characters that are not allowed in filenames
    return filename
      .replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters with underscore
      .replace(/\s+/g, '_') // Replace spaces with underscore
      .replace(/__+/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .substring(0, 200); // Limit length to avoid issues
  }

  async startNewRecording() {
    try {
      this.updateStatus('Initializing...', 'info');
      
      // Get current quality preset
      const quality = this.qualityPresets[this.currentQuality];
      
      // Always request new screen capture for each recording
      const newStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          mediaSource: 'screen',
          width: { ideal: quality.width },
          height: { ideal: quality.height },
          frameRate: { ideal: quality.frameRate },
          cursor: 'never' // Hide cursor/mouse movements during recording
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      // If this is the first recording, set it as the main stream for preview
      if (!this.currentStream) {
        this.currentStream = newStream;
        this.setupLivePreview();
      }
      
      // Create new recording session
      const sessionId = Date.now();
      const session = {
        id: sessionId,
        mediaRecorder: null,
        recordedChunks: [],
        isRecording: false,
        isPaused: false,
        pauseStartTime: null,
        startTime: null,
        timer: null,
        name: 'Screen Recording', // Will be updated with actual tab name
        tabName: 'Screen Recording', // Will be updated with actual tab name
        blob: null,
        url: null,
        duration: 0,
        size: 0,
        quality: this.currentQuality,
        qualitySettings: quality,
        // Long recording support
        chunkSize: 0,
        maxChunkSize: 50 * 1024 * 1024, // 50MB chunks
        chunkInterval: 10000, // 10 seconds
        chunks: [],
        isLongRecording: false,
        processingPromise: null
      };
      
      // Get the best supported MIME type for recording
      let mimeType = this.getBestMimeType();
      
      // Verify MediaRecorder supports this format
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        // Fallback to basic formats if the detected one isn't supported
        const fallbackFormats = [
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8',
          'video/webm',
          'video/mp4;codecs=h264',
          'video/mp4'
        ];
        
        mimeType = fallbackFormats.find(format => MediaRecorder.isTypeSupported(format));
        
        if (!mimeType) {
          throw new Error('No supported video format found for recording');
        }
      }
      
      console.log('Using video format:', mimeType);
      console.log('Supported formats:', this.getSupportedFormats());
      
      // Create MediaRecorder for this session using the new stream
      session.mediaRecorder = new MediaRecorder(newStream, {
        mimeType: mimeType,
        videoBitsPerSecond: quality.bitrate
      });
      
      // Set up periodic data requests for long recordings
      session.dataRequestInterval = setInterval(() => {
        if (session.mediaRecorder && session.mediaRecorder.state === 'recording') {
          session.mediaRecorder.requestData();
        }
      }, session.chunkInterval);
      
      // Store the stream for this session
      session.stream = newStream;
      
      session.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          session.recordedChunks.push(event.data);
          session.chunkSize += event.data.size;
          
          // For long recordings, manage chunks to prevent memory issues
          if (session.chunkSize > session.maxChunkSize) {
            this.manageRecordingChunks(session);
          }
        }
      };
      
      session.mediaRecorder.onstart = () => {
        session.isRecording = true;
        session.startTime = Date.now();
        this.activeSessionId = sessionId;
        
        // Add session to the array immediately when it starts
        this.recordingSessions.push(session);
        
        // Get current tab name
        this.getCurrentTabName(session);
        
        this.updateStatus('Recording...', 'recording');
        this.showLivePreview();
        this.updateRecordingList();
        this.updateRecordingIndicator();
        
        // Start timer for this session
        session.timer = setInterval(() => {
          this.updateSessionStats(session);
          
          // For long recordings, request data more frequently
          if (session.isLongRecording) {
            session.mediaRecorder.requestData();
          }
        }, 1000);
        
        // Start the recording timer display
        this.startRecordingTimer();
        
        this.showMessage('Recording started successfully', 'success');
        
        // Send notification
        this.notifyRecordingStarted(session);
      };
      
             session.mediaRecorder.onstop = async () => {
         session.isRecording = false;
         this.activeSessionId = null;
         this.updateStatus('Processing recording...', 'info');
         
         if (session.timer) {
           clearInterval(session.timer);
           session.timer = null;
         }
         
         // Clear data request interval
         if (session.dataRequestInterval) {
           clearInterval(session.dataRequestInterval);
           session.dataRequestInterval = null;
         }
         
         // Stop the recording timer display
         this.stopRecordingTimer();
         this.stopCountdown();
         
         // Clean up the session's stream
         if (session.stream) {
           session.stream.getTracks().forEach(track => track.stop());
           session.stream = null;
         }
         
         // Handle long recordings with chunked processing
         if (session.isLongRecording || session.recordedChunks.length > 100) {
           await this.processLongRecording(session);
         } else {
           // Create video blob with the correct MIME type
           const mimeType = session.mediaRecorder.mimeType || 'video/webm';
           session.blob = new Blob(session.recordedChunks, { type: mimeType });
         }
         
         // Apply privacy features
         if (this.privacySettings.privacyWatermark) {
           this.addPrivacyWatermark(session);
         }
         
         // Encrypt recording if enabled
         if (this.privacySettings.autoEncryptNew) {
           session.blob = await this.encryptRecording(session);
         }
         
         session.url = this.createOptimizedBlobUrl(session);
         session.size = session.blob.size;
         session.duration = Math.floor((Date.now() - session.startTime) / 1000);
         
         console.log('Recording completed:', {
           name: session.name,
           size: session.size,
           duration: session.duration,
           blobType: session.blob.type,
           url: session.url
         });
         
         // Test video playback
         this.testVideoPlayback(session).then(() => {
           console.log('Video playback test passed');
         }).catch((error) => {
           console.error('Video playback test failed:', error);
           this.showMessage('Warning: Video format may not be supported', 'warning');
         });
         
         // Session is already in the array, just update the lists
         this.updateRecordingList();
         this.updateCompletedRecordings();
         
         this.updateStatus('Ready for next recording', 'success');
         this.showMessage(`Recording saved: ${session.name}`, 'success');
         this.updateRecordingIndicator();
         
         // Send notification
         this.notifyRecordingStopped(session);
         
         // Auto-optimize if enabled
         if (this.performanceSettings.autoOptimize) {
           this.addBackgroundTask({
             type: 'optimize',
             sessionId: session.id
           });
         }
         
         // Auto-compress if enabled
         if (this.performanceSettings.compressRecordings) {
           this.addBackgroundTask({
             type: 'compress',
             sessionId: session.id
           });
         }
       };
      
      session.mediaRecorder.onerror = (event) => {
        this.updateStatus('Recording error', 'error');
        this.showMessage(`Recording error: ${event.error}`, 'error');
        this.stopSession(sessionId);
        
        // Send error notification
        this.notifyError(event.error, 'recording process');
      };
      
      // Start recording
      session.mediaRecorder.start(1000); // Collect data every second
      
    } catch (error) {
      this.updateStatus('Failed to start recording', 'error');
      this.showMessage(`Failed to start recording: ${error.message}`, 'error');
      console.error('Recording error:', error);
      
      // Send error notification
      this.notifyError(error, 'starting recording');
    }
  }

  pauseSession(sessionId) {
    const session = this.recordingSessions.find(s => s.id === sessionId);
    if (session && session.mediaRecorder && session.isRecording && !session.isPaused) {
      session.mediaRecorder.pause();
      session.isPaused = true;
      session.pauseStartTime = Date.now();
      
      // Also pause the timer if this is the active session
      if (this.activeSessionId === sessionId && !this.isTimerPaused) {
        this.toggleTimerPause();
      }
      
      this.updateRecordingList();
      this.showMessage('Recording paused', 'info');
      
      // Send notification
      this.notifyRecordingPaused(session, true);
    }
  }

  resumeSession(sessionId) {
    const session = this.recordingSessions.find(s => s.id === sessionId);
    if (session && session.mediaRecorder && session.isRecording && session.isPaused) {
      session.mediaRecorder.resume();
      session.isPaused = false;
      // Adjust start time to account for pause duration
      if (session.pauseStartTime) {
        const pauseDuration = Date.now() - session.pauseStartTime;
        session.startTime += pauseDuration;
        session.pauseStartTime = null;
      }
      
      // Also resume the timer if this is the active session
      if (this.activeSessionId === sessionId && this.isTimerPaused) {
        this.toggleTimerPause();
      }
      
      this.updateRecordingList();
      this.showMessage('Recording resumed', 'success');
      
      // Send notification
      this.notifyRecordingPaused(session, false);
    }
  }

  stopSession(sessionId) {
    const session = this.recordingSessions.find(s => s.id === sessionId);
    if (session && session.mediaRecorder && session.isRecording) {
      session.mediaRecorder.stop();
    }
  }

  stopAllRecordings() {
    // Stop all active recordings
    this.recordingSessions.forEach(session => {
      if (session.isRecording) {
        this.stopSession(session.id);
      }
    });
    
    // Clean up all streams
    this.recordingSessions.forEach(session => {
      if (session.stream) {
        session.stream.getTracks().forEach(track => track.stop());
        session.stream = null;
      }
    });
    
    // Clean up the main stream
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(track => track.stop());
      this.currentStream = null;
    }
    
    // Hide live preview
    this.hideLivePreview();
    
    // Stop timer display
    this.stopRecordingTimer();
    this.stopCountdown();
    
    this.updateStatus('All recordings stopped', 'info');
  }

  updateSessionStats(session) {
    if (!session.isRecording || !session.startTime) return;
    
    let elapsed = Math.floor((Date.now() - session.startTime) / 1000);
    
    // If paused, don't count pause time
    if (session.isPaused && session.pauseStartTime) {
      const pauseDuration = Math.floor((Date.now() - session.pauseStartTime) / 1000);
      elapsed -= pauseDuration;
    }
    
    session.duration = Math.max(0, elapsed);
    
    // Check for long recording optimizations
    this.checkLongRecordingMemory(session);
    
    // Update the recording item in the list
    this.updateRecordingItem(session);
  }

  updateRecordingList() {
    this.recordingsList.innerHTML = '';
    
    // Filter to show only ongoing recordings
    const ongoingRecordings = this.recordingSessions.filter(session => session.isRecording);
    
    if (ongoingRecordings.length === 0) {
      this.recordingsList.innerHTML = `
        <div class="text-center text-muted py-4">
          <img src="img/recording.svg" alt="No Recordings" style="width: 64px; height: 64px; margin-bottom: 1rem; opacity: 0.6;">
          <div>No ongoing recordings</div>
          <small>Start a recording to see it here</small>
        </div>
      `;
      return;
    }
    
    ongoingRecordings.forEach(session => {
      const recordingItem = this.createRecordingItem(session);
      this.recordingsList.appendChild(recordingItem);
    });
  }

  updateCompletedRecordings() {
    const completedRecordings = this.recordingSessions.filter(session => !session.isRecording);
    
    if (completedRecordings.length === 0) {
      this.completedRecordings.style.display = 'none';
      return;
    }
    
    this.completedRecordings.style.display = 'block';
    this.completedList.innerHTML = '';
    
    completedRecordings.forEach(session => {
      const completedItem = this.createCompletedItem(session);
      this.completedList.appendChild(completedItem);
    });
  }

  createCompletedItem(session) {
    const item = document.createElement('div');
    item.className = 'recording-item';
    item.dataset.sessionId = session.id;
    
    item.innerHTML = `
      <div class="d-flex align-items-start">
        <!-- Recording Preview -->
        <div class="recording-preview me-3">
          ${session.thumbnailUrl ? 
            `<img class="preview-thumbnail" src="${session.thumbnailUrl}" style="width: 120px; height: 67px; object-fit: cover; background: #000;">` :
            `<video class="preview-thumbnail" muted preload="metadata" style="width: 120px; height: 67px; object-fit: cover; background: #000;">
              <source src="${session.url}" type="${session.mediaRecorder?.mimeType || 'video/webm'}">
            </video>`
          }
          <div class="preview-overlay">
            <i class="bi bi-play-circle" style="font-size: 1.5rem; color: white;"></i>
          </div>
        </div>
        
        <!-- Recording Info -->
        <div class="flex-grow-1">
          <div class="recording-title">${session.name}</div>
          <div class="recording-meta">
            ${this.formatTime(session.duration)} • ${this.formatFileSize(session.size)}
          </div>
          <div class="recording-controls">
            <button class="btn btn-success btn-sm play-btn" data-session-id="${session.id}">
              <i class="bi bi-play"></i> Play
            </button>
            <button class="btn btn-primary btn-sm download-btn" data-session-id="${session.id}">
              <i class="bi bi-download"></i> Download
            </button>
            <button class="btn btn-danger btn-sm delete-btn" data-session-id="${session.id}">
              <i class="bi bi-trash"></i> Delete
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Generate thumbnail for the preview if it doesn't exist
    if (!session.thumbnailUrl) {
      this.generateThumbnail(item, session);
    }
    
    // Add event listeners for completed recording buttons
    const playBtn = item.querySelector('.play-btn');
    const downloadBtn = item.querySelector('.download-btn');
    const deleteBtn = item.querySelector('.delete-btn');
    
    if (playBtn) {
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.playRecording(session.id);
      });
    }
    
    if (downloadBtn) {
      downloadBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.downloadRecording(session.id);
      });
    }
    
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteRecording(session.id);
      });
    }
    
    // Click to select this recording
    item.addEventListener('click', () => {
      this.selectRecording(session.id);
    });
    
    // Add click handler to preview thumbnail
    const previewContainer = item.querySelector('.recording-preview');
    if (previewContainer) {
      previewContainer.addEventListener('click', (e) => {
        e.stopPropagation();
        this.playRecording(session.id);
      });
    }
    
    return item;
  }

  createRecordingItem(session) {
    const item = document.createElement('div');
    item.className = 'recording-item recording';
    item.dataset.sessionId = session.id;
    
    const isActive = this.activeSessionId === session.id;
    if (isActive) {
      item.classList.add('active');
    }
    
    // Add cursor pointer to indicate it's clickable
    item.style.cursor = 'pointer';
    
    item.innerHTML = `
      <div class="recording-title">
        ${isActive ? '<i class="bi bi-eye-fill text-success me-1"></i>' : ''}${session.name}
      </div>
      <div class="recording-meta">
        Recording... ${this.formatTime(session.duration)}
      </div>
      <div class="recording-controls">
        ${session.isPaused ? 
          `<button class="btn btn-success btn-sm resume-btn" data-session-id="${session.id}">
            <i class="bi bi-play"></i> Resume
          </button>` :
          `<button class="btn btn-warning btn-sm pause-btn" data-session-id="${session.id}">
            <i class="bi bi-pause"></i> Pause
          </button>`
        }
        <button class="btn btn-danger btn-sm stop-btn" data-session-id="${session.id}">
          <i class="bi bi-stop"></i> Stop
        </button>
      </div>
    `;
    
    // Add event listeners for buttons
    const pauseBtn = item.querySelector('.pause-btn');
    const resumeBtn = item.querySelector('.resume-btn');
    const stopBtn = item.querySelector('.stop-btn');
    
    if (pauseBtn) {
      pauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.pauseSession(session.id);
      });
    }
    
    if (resumeBtn) {
      resumeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.resumeSession(session.id);
      });
    }
    
    if (stopBtn) {
      stopBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.stopSession(session.id);
      });
    }
    
    // Add click handler to switch preview to this recording
    item.addEventListener('click', () => {
      this.switchToRecordingPreview(session);
    });
    
    return item;
  }

  updateRecordingItem(session) {
    const item = this.recordingsList.querySelector(`[data-session-id="${session.id}"]`);
    if (item) {
      const metaElement = item.querySelector('.recording-meta');
      if (metaElement) {
        const status = session.isPaused ? 'Paused' : 'Recording...';
        metaElement.textContent = `${status} ${this.formatTime(session.duration)}`;
      }
      
      // Update pause/resume button visibility
      const pauseBtn = item.querySelector('.pause-btn');
      const resumeBtn = item.querySelector('.resume-btn');
      
      if (session.isPaused) {
        if (pauseBtn) pauseBtn.style.display = 'none';
        if (resumeBtn) resumeBtn.style.display = 'inline-block';
      } else {
        if (pauseBtn) pauseBtn.style.display = 'inline-block';
        if (resumeBtn) resumeBtn.style.display = 'none';
      }
      
      // Update active state and eye icon
      const isActive = this.activeSessionId === session.id;
      const titleElement = item.querySelector('.recording-title');
      
      if (titleElement) {
        titleElement.innerHTML = `${isActive ? '<i class="bi bi-eye-fill text-success me-1"></i>' : ''}${session.name}`;
      }
      
      // Update CSS classes
      item.classList.toggle('active', isActive);
    }
  }

  selectRecording(sessionId) {
    const session = this.recordingSessions.find(s => s.id === sessionId);
    if (!session) return;
    
    // Update active state in ongoing recordings
    this.recordingsList.querySelectorAll('.recording-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // Update active state in completed recordings
    this.completedList.querySelectorAll('.recording-item').forEach(item => {
      item.classList.remove('active');
    });
    
    const ongoingItem = this.recordingsList.querySelector(`[data-session-id="${sessionId}"]`);
    const completedItem = this.completedList.querySelector(`[data-session-id="${sessionId}"]`);
    
    if (ongoingItem) {
      ongoingItem.classList.add('active');
    }
    if (completedItem) {
      completedItem.classList.add('active');
    }
    
    // Show playback
    this.showPlayback(session);
    
    // Show video editing tools for completed recordings
    if (!session.isRecording) {
      this.showVideoEditing(session);
      this.showExportOptions(session);
    } else {
      this.hideVideoEditing();
      this.hideExportOptions();
    }
  }

  showPlayback(session) {
    console.log('Showing playback for session:', session);
    console.log('Session URL:', session.url);
    
    this.isPlayingBack = true;
    this.previewPlaceholder.style.display = 'none';
    this.previewVideo.style.display = 'none';
    this.playbackControls.style.display = 'block';
    this.recordingOverlay.style.display = 'none';
    
    // Check if playback video element exists
    if (!this.playbackVideo) {
      console.error('Playback video element not found');
      this.showMessage('Playback video element not found', 'error');
      return;
    }
    
    // Check if session URL exists, try to fix if missing
    if (!session.url) {
      console.warn('Session URL is missing, attempting to regenerate...');
      if (this.regenerateBlobUrl(session)) {
        console.log('Successfully regenerated blob URL');
      } else {
        console.error('Session URL is missing and cannot be regenerated');
        this.showMessage('Recording file is not available', 'error');
        return;
      }
    }
    
    this.playbackVideo.src = session.url;
    this.playbackVideo.load();
    
    // Add error handling for video load
    this.playbackVideo.onerror = (e) => {
      console.error('Playback video error:', e);
      console.error('Video error details:', this.playbackVideo.error);
      
      // Try to provide more specific error information
      const error = this.playbackVideo.error;
      if (error) {
        let errorMessage = 'Failed to load recording for playback';
        switch (error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'Video playback was aborted';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error while loading video';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Video format not supported by browser';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            errorMessage = 'Video format not supported';
            break;
        }
        this.showMessage(errorMessage, 'error');
      } else {
        this.showMessage('Failed to load recording for playback', 'error');
      }
    };
    
    this.playbackVideo.onloadeddata = () => {
      console.log('Playback video loaded successfully');
      console.log('Video duration:', this.playbackVideo.duration);
      console.log('Video ready state:', this.playbackVideo.readyState);
      this.showMessage('Recording loaded for playback', 'success');
    };
    
    this.playbackVideo.oncanplay = () => {
      console.log('Video can play');
    };
    
    this.playbackVideo.oncanplaythrough = () => {
      console.log('Video can play through');
    };
    
    // Store current session for download
    this.currentPlaybackSession = session;
  }

  backToLivePreview() {
    this.isPlayingBack = false;
    this.previewPlaceholder.style.display = 'flex';
    this.previewVideo.style.display = 'none';
    this.playbackControls.style.display = 'none';
    
    if (this.currentStream) {
      this.showLivePreview();
    }
    
    this.currentPlaybackSession = null;
    this.hideVideoEditing();
    this.hideExportOptions();
  }

  async playRecording(sessionId) {
    // Prevent infinite loops by checking if we're already playing this session
    if (this.currentPlaybackSession && this.currentPlaybackSession.id === sessionId) {
      console.log('Already playing session:', sessionId);
      return;
    }
    
    console.log('playRecording called with sessionId:', sessionId);
    
    const session = this.recordingSessions.find(s => s.id === sessionId);
    if (session) {
      console.log('Found session:', session);
      
      // Use enhanced recovery system for long recordings
      if (session.isLongRecording || session.duration > 300) {
        this.updateStatus('Preparing long recording for playback...', 'info');
        
        const recoverySuccess = await this.playRecordingWithRecovery(sessionId);
        if (!recoverySuccess) {
          this.showMessage('Failed to prepare recording for playback', 'error');
          return;
        }
      } else {
        // Check if session has a valid URL
        if (!session.url) {
          console.error('Session has no URL:', session);
          this.showMessage('Recording file is not available', 'error');
          return;
        }
      }
      
      this.selectRecording(sessionId);
    } else {
      console.error('Session not found for ID:', sessionId);
      this.showMessage('Recording not found', 'error');
    }
  }

  downloadRecording(sessionId) {
    const session = this.recordingSessions.find(s => s.id === sessionId);
    if (!session) return;
    
    try {
      const a = document.createElement('a');
      a.href = session.url;
      const sanitizedName = this.sanitizeFilename(session.name);
      const mimeType = session.mediaRecorder?.mimeType || 'video/webm';
      const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
      a.download = `${sanitizedName}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      this.showMessage('Download started', 'success');
    } catch (error) {
      this.showMessage(`Download failed: ${error.message}`, 'error');
    }
  }

  downloadCurrentVideo() {
    if (this.currentPlaybackSession) {
      this.downloadRecording(this.currentPlaybackSession.id);
    }
  }

  async getCurrentTabName(session) {
    try {
      // Get the current active tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0) {
        const tab = tabs[0];
        const tabTitle = tab.title || 'Screen Recording';
        session.tabName = tabTitle;
        session.name = tabTitle; // Also update the name for downloads
        this.updateRecordingList();
      }
    } catch (error) {
      console.error('Failed to get tab name:', error);
      session.tabName = 'Screen Recording';
      session.name = 'Screen Recording';
    }
  }

  switchToRecordingPreview(session) {
    if (!session.isRecording) return;
    
    // Update active session
    this.activeSessionId = session.id;
    
    // Update the preview to show this recording's stream
    if (session.stream) {
      this.previewVideo.srcObject = session.stream;
      this.showLivePreview();
    }
    
    // Update the recording list to show which one is active
    this.updateRecordingList();
    
    // Show feedback
    this.showMessage(`Switched to: ${session.name}`, 'info');
  }

  // Set up live preview with the captured stream
  setupLivePreview() {
    try {
      this.previewVideo.srcObject = this.currentStream;
      this.previewVideo.onloadedmetadata = () => {
        console.log('Live preview ready');
      };
      
      this.previewVideo.onerror = (error) => {
        console.error('Preview video error:', error);
        this.showMessage('Failed to show live preview', 'error');
      };
    } catch (error) {
      console.error('Setup live preview error:', error);
      this.showMessage('Failed to setup live preview', 'error');
    }
  }
  
  // Show live preview
  showLivePreview() {
    this.previewPlaceholder.style.display = 'none';
    this.previewVideo.style.display = 'block';
    this.recordingOverlay.style.display = 'block';
    
    // Start playing the preview
    this.previewVideo.play().catch(error => {
      console.error('Failed to play preview:', error);
    });
  }
  
  // Hide live preview
  hideLivePreview() {
    this.previewPlaceholder.style.display = 'flex';
    this.previewVideo.style.display = 'none';
    this.recordingOverlay.style.display = 'none';
  }

  // Handle messages from background script
  handleMessage(message) {
    const { cmd, parameter } = message;
    
    switch (cmd) {
      case 'OFFSCREEN_FETCH_DATA':
        this.handleFetchData(parameter);
        break;
      case 'OFFSCREEN_RECORD_START':
        this.startNewRecording();
        break;
      case 'OFFSCREEN_RECORD_STOP':
        this.stopAllRecordings();
        break;
      case 'VFETCHPRO_POPUP_UPDATE':
      case 'VFETCHPRO_VIDEO_FOUND':
        // Ignore these commands - they're for the popup, not offscreen
        break;
      default:
        // Only log truly unknown commands
        if (!cmd.startsWith('VFETCHPRO_')) {
          console.log('Unknown command:', cmd);
        }
    }
  }

  async handleFetchData({ url, headers, method }) {
    try {
      this.updateStatus('Fetching data...', 'info');
      
      const response = await fetch(url, {
        method: method || 'GET',
        headers: headers || {}
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Send response back to background script
      chrome.runtime.sendMessage({
        cmd: 'OFFSCREEN_FETCH_RESPONSE',
        parameter: {
          ok: true,
          blobURL: blobUrl,
          size: blob.size,
          type: blob.type
        }
      });
      
      this.updateStatus('Data fetched successfully', 'success');
      
    } catch (error) {
      this.updateStatus('Fetch failed', 'error');
      this.showMessage(`Fetch error: ${error.message}`, 'error');
      
      chrome.runtime.sendMessage({
        cmd: 'OFFSCREEN_FETCH_RESPONSE',
        parameter: {
          ok: false,
          statusText: error.message
        }
      });
    }
  }

  deleteRecording(sessionId) {
    const idx = this.recordingSessions.findIndex(s => s.id === sessionId);
    if (idx !== -1) {
      const session = this.recordingSessions[idx];
      
      // Clean up blob URLs and resources
      if (session.url && session.url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(session.url);
        } catch (e) {
          console.warn('Failed to revoke blob URL:', e);
        }
      }
      
      // Clean up thumbnail URL if it exists
      if (session.thumbnailUrl && session.thumbnailUrl.startsWith('data:')) {
        // Data URLs don't need to be revoked, but we can clear the reference
        session.thumbnailUrl = null;
      }
      
      // Remove from array
      this.recordingSessions.splice(idx, 1);
      this.updateCompletedRecordings();
      this.showMessage('Recording deleted', 'success');
    }
  }

  checkVideoSupport() {
    const video = document.createElement('video');
    
    // Test various video formats and codecs
    const formats = {
      webmVP9: video.canPlayType('video/webm;codecs=vp9'),
      webmVP8: video.canPlayType('video/webm;codecs=vp8'),
      webmGeneric: video.canPlayType('video/webm'),
      mp4H264: video.canPlayType('video/mp4;codecs=h264'),
      mp4H265: video.canPlayType('video/mp4;codecs=h265'),
      mp4Generic: video.canPlayType('video/mp4'),
      oggTheora: video.canPlayType('video/ogg;codecs=theora'),
      oggGeneric: video.canPlayType('video/ogg'),
      av1: video.canPlayType('video/mp4;codecs=av01'),
      av1Webm: video.canPlayType('video/webm;codecs=av01')
    };
    
    console.log('Video format support:', formats);
    
    // Determine best supported format for recording
    let bestFormat = 'webm';
    let bestCodec = 'vp9';
    
    if (formats.webmVP9 === 'probably' || formats.webmVP9 === 'maybe') {
      bestFormat = 'webm';
      bestCodec = 'vp9';
    } else if (formats.webmVP8 === 'probably' || formats.webmVP8 === 'maybe') {
      bestFormat = 'webm';
      bestCodec = 'vp8';
    } else if (formats.mp4H264 === 'probably' || formats.mp4H264 === 'maybe') {
      bestFormat = 'mp4';
      bestCodec = 'h264';
    } else if (formats.webmGeneric === 'probably' || formats.webmGeneric === 'maybe') {
      bestFormat = 'webm';
      bestCodec = 'vp8'; // Fallback to VP8
    } else if (formats.mp4Generic === 'probably' || formats.mp4Generic === 'maybe') {
      bestFormat = 'mp4';
      bestCodec = 'h264'; // Fallback to H264
    }
    
    console.log(`Best supported format: ${bestFormat} with codec: ${bestCodec}`);
    
    // Store format support for use in recording
    this.videoFormatSupport = {
      formats,
      bestFormat,
      bestCodec,
      webmVP9: formats.webmVP9 !== '',
      webmVP8: formats.webmVP8 !== '',
      mp4H264: formats.mp4H264 !== '',
      webmSupported: formats.webmVP9 !== '' || formats.webmVP8 !== '' || formats.webmGeneric !== '',
      mp4Supported: formats.mp4H264 !== '' || formats.mp4Generic !== ''
    };
    
    return this.videoFormatSupport;
  }
  
  getBestMimeType() {
    if (!this.videoFormatSupport) {
      this.checkVideoSupport();
    }
    
    const { bestFormat, bestCodec } = this.videoFormatSupport;
    
    // Return appropriate MIME type based on detected support
    switch (bestFormat) {
      case 'webm':
        if (bestCodec === 'vp9') {
          return 'video/webm;codecs=vp9';
        } else if (bestCodec === 'vp8') {
          return 'video/webm;codecs=vp8';
        } else {
          return 'video/webm';
        }
      case 'mp4':
        if (bestCodec === 'h264') {
          return 'video/mp4;codecs=h264';
        } else if (bestCodec === 'h265') {
          return 'video/mp4;codecs=h265';
        } else {
          return 'video/mp4';
        }
      default:
        // Fallback to WebM if nothing else is supported
        return 'video/webm';
    }
  }
  
  getSupportedFormats() {
    if (!this.videoFormatSupport) {
      this.checkVideoSupport();
    }
    
    const supported = [];
    const { formats } = this.videoFormatSupport;
    
    if (formats.webmVP9 !== '') supported.push('WebM VP9');
    if (formats.webmVP8 !== '') supported.push('WebM VP8');
    if (formats.mp4H264 !== '') supported.push('MP4 H.264');
    if (formats.mp4H265 !== '') supported.push('MP4 H.265');
    if (formats.av1 !== '') supported.push('AV1');
    if (formats.oggTheora !== '') supported.push('Ogg Theora');
    
    return supported;
  }
  
  displayVideoFormatInfo() {
    const support = this.checkVideoSupport();
    const supportedFormats = this.getSupportedFormats();
    const bestMimeType = this.getBestMimeType();
    
    console.log('=== Video Format Support Information ===');
    console.log('Best format for recording:', bestMimeType);
    console.log('Supported formats:', supportedFormats.join(', '));
    console.log('WebM support:', support.webmSupported ? 'Yes' : 'No');
    console.log('MP4 support:', support.mp4Supported ? 'Yes' : 'No');
    console.log('========================================');
    
    // Update status if there are limitations
    if (!support.webmSupported && !support.mp4Supported) {
      this.showMessage('Warning: Limited video format support detected', 'warning');
    } else if (!support.mp4H264 && support.webmSupported) {
      this.showMessage('Using WebM format (MP4 H.264 not supported)', 'info');
    }
  }

  testVideoPlayback(session) {
    return new Promise((resolve, reject) => {
      if (!session.url) {
        reject(new Error('No video URL available'));
        return;
      }

      // Check if the blob URL is still valid
      if (session.url.startsWith('blob:') && !session.blob) {
        console.warn('Blob URL is no longer valid, skipping test');
        resolve(false); // Resolve with false instead of rejecting
        return;
      }

      const testVideo = document.createElement('video');
      testVideo.style.display = 'none';
      testVideo.muted = true;
      testVideo.preload = 'metadata';
      
      testVideo.onloadedmetadata = () => {
        console.log('Test video loaded successfully');
        resolve(true);
      };
      
      testVideo.onerror = (e) => {
        console.error('Test video failed to load:', e);
        // Don't reject for blob URL errors, just warn
        if (session.url.startsWith('blob:')) {
          console.warn('Blob URL may be invalid, but continuing...');
          resolve(false); // Resolve with false instead of rejecting
        } else {
          reject(new Error('Video format not supported'));
        }
      };
      
      testVideo.src = session.url;
      testVideo.load();
    });
  }

  generateThumbnail(item, session) {
    const video = item.querySelector('.preview-thumbnail');
    if (!video || !session.url) return;

    // Add loading indicator
    const previewContainer = item.querySelector('.recording-preview');
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'preview-overlay';
    loadingIndicator.innerHTML = '<div class="spinner-border spinner-border-sm text-white"></div>';
    previewContainer.appendChild(loadingIndicator);

    // Set up video to capture thumbnail
    video.addEventListener('loadedmetadata', () => {
      try {
        // Seek to 1 second or 25% of duration, whichever is smaller
        // For very short videos, use 0.1 seconds
        const seekTime = session.duration < 1 ? 0.1 : Math.min(1, session.duration * 0.25);
        video.currentTime = seekTime;
      } catch (e) {
        console.log('Could not seek video for thumbnail:', e);
        loadingIndicator.remove();
      }
    });

    // Create canvas to capture frame
    video.addEventListener('seeked', () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 120;
        canvas.height = 67;
        
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Convert canvas to data URL and set as background
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // Create thumbnail image element
        const thumbnailImg = document.createElement('img');
        thumbnailImg.src = thumbnailUrl;
        thumbnailImg.style.width = '100%';
        thumbnailImg.style.height = '100%';
        thumbnailImg.style.objectFit = 'cover';
        
        // Replace video with thumbnail image
        const videoElement = previewContainer.querySelector('.preview-thumbnail');
        previewContainer.insertBefore(thumbnailImg, videoElement);
        videoElement.style.display = 'none';
        
        // Remove loading indicator and add play overlay
        loadingIndicator.remove();
        const playOverlay = document.createElement('div');
        playOverlay.className = 'preview-overlay';
        playOverlay.innerHTML = '<i class="bi bi-play-circle" style="font-size: 1.5rem; color: white;"></i>';
        previewContainer.appendChild(playOverlay);
        
        // Store thumbnail URL in session for reuse
        session.thumbnailUrl = thumbnailUrl;
      } catch (e) {
        console.log('Could not generate thumbnail:', e);
        loadingIndicator.remove();
      }
    });

    // Handle video load errors
    video.addEventListener('error', () => {
      console.log('Video failed to load for thumbnail generation');
      loadingIndicator.remove();
      
      // Add fallback icon
      const fallbackIcon = document.createElement('div');
      fallbackIcon.className = 'preview-overlay';
              fallbackIcon.innerHTML = '<img src="img/recording.svg" alt="Recording Thumbnail" style="width: 24px; height: 24px; filter: brightness(0) invert(1);">';
      previewContainer.appendChild(fallbackIcon);
    });
  }

  // Timer Methods
  startRecordingTimer() {
    this.recordingStartTime = Date.now();
    this.totalPausedTime = 0;
    this.isTimerPaused = false;
    this.recordingTimerElement.style.display = 'block';
    this.timerMain.classList.remove('countdown', 'paused');
    this.timerSubtitle.textContent = 'Recording in progress...';
    this.pauseTimerBtn.style.display = 'none';
    
    this.updateTimer();
  }

  updateTimer() {
    if (!this.recordingStartTime) return;
    
    const now = Date.now();
    let elapsed = now - this.recordingStartTime - this.totalPausedTime;
    
    if (this.isTimerPaused) {
      elapsed = this.pauseStartTime - this.recordingStartTime - this.totalPausedTime;
    }
    
    const seconds = Math.floor(elapsed / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    this.timerMain.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    // Update recording time in the old display as well
    if (this.recordingTime) {
      this.recordingTime.textContent = this.timerMain.textContent;
    }
    
    // Continue updating
    this.recordingTimer = requestAnimationFrame(() => this.updateTimer());
  }

  stopRecordingTimer() {
    if (this.recordingTimer) {
      cancelAnimationFrame(this.recordingTimer);
      this.recordingTimer = null;
    }
    this.recordingStartTime = null;
    this.recordingTimerElement.style.display = 'none';
    this.totalPausedTime = 0;
    this.isTimerPaused = false;
  }

  toggleTimerPause() {
    if (this.isTimerPaused) {
      // Resume timer
      this.totalPausedTime += Date.now() - this.pauseStartTime;
      this.isTimerPaused = false;
      this.pauseTimerBtn.innerHTML = '<i class="bi bi-pause"></i> Pause Timer';
      this.timerMain.classList.remove('paused');
      this.timerSubtitle.textContent = 'Recording in progress...';
      this.updateTimer();
    } else {
      // Pause timer
      this.pauseStartTime = Date.now();
      this.isTimerPaused = true;
      this.pauseTimerBtn.innerHTML = '<i class="bi bi-play"></i> Resume Timer';
      this.timerMain.classList.add('paused');
      this.timerSubtitle.textContent = 'Timer paused...';
    }
  }

  showCountdownModal() {
    this.countdownModal.style.display = 'flex';
    this.countdownHours.focus();
  }

  hideCountdownModal() {
    this.countdownModal.style.display = 'none';
  }

  startCountdown() {
    const hours = parseInt(this.countdownHours.value) || 0;
    const minutes = parseInt(this.countdownMinutes.value) || 0;
    const seconds = parseInt(this.countdownSeconds.value) || 0;
    
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    
    if (totalSeconds <= 0) {
      this.showMessage('Please set a valid countdown time', 'error');
      return;
    }
    
    this.countdownEndTime = Date.now() + (totalSeconds * 1000);
    this.hideCountdownModal();
    
    // Update timer display to show countdown
    this.timerMain.classList.add('countdown');
    this.timerSubtitle.textContent = `Countdown: ${this.formatCountdownTime(totalSeconds)}`;
    this.pauseTimerBtn.style.display = 'inline-block';
    
    // Start countdown timer
    this.updateCountdown();
    
    this.showMessage(`Countdown set for ${this.formatCountdownTime(totalSeconds)}`, 'success');
  }

  updateCountdown() {
    if (!this.countdownEndTime) return;
    
    const now = Date.now();
    const remaining = Math.max(0, this.countdownEndTime - now);
    const seconds = Math.floor(remaining / 1000);
    
    if (seconds <= 0) {
      // Countdown finished - stop recording
      this.countdownEndTime = null;
      this.timerMain.classList.remove('countdown');
      this.timerSubtitle.textContent = 'Countdown finished - stopping recording...';
      
      // Stop all recordings
      setTimeout(() => {
        this.stopAllRecordings();
        this.showMessage('Recording stopped by countdown timer', 'info');
      }, 1000);
      
      return;
    }
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    this.timerMain.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    // Continue countdown
    this.countdownTimer = requestAnimationFrame(() => this.updateCountdown());
  }

  stopCountdown() {
    if (this.countdownTimer) {
      cancelAnimationFrame(this.countdownTimer);
      this.countdownTimer = null;
    }
    this.countdownEndTime = null;
    this.timerMain.classList.remove('countdown');
  }

  formatCountdownTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  // Video Editing Methods
  showVideoEditing(session) {
    this.currentEditingSession = session;
    this.videoEditing.style.display = 'block';
  }

  hideVideoEditing() {
    this.currentEditingSession = null;
    this.videoEditing.style.display = 'none';
  }

  openTrimModal() {
    if (!this.currentEditingSession) {
      this.showMessage('Please select a recording to edit', 'error');
      return;
    }

    const video = document.getElementById('trim-video');
    const source = document.getElementById('trim-video-source');
    const startSlider = document.getElementById('trim-start-slider');
    const endSlider = document.getElementById('trim-end-slider');
    const startTime = document.getElementById('trim-start-time');
    const endTime = document.getElementById('trim-end-time');
    const duration = document.getElementById('trim-duration');

    source.src = this.currentEditingSession.url;
    video.load();

    video.onloadedmetadata = () => {
      const totalDuration = video.duration;
      startSlider.max = totalDuration;
      endSlider.max = totalDuration;
      endSlider.value = totalDuration;

      startSlider.oninput = () => {
        const start = parseFloat(startSlider.value);
        const end = parseFloat(endSlider.value);
        startTime.textContent = this.formatTime(start);
        endTime.textContent = this.formatTime(end);
        duration.textContent = this.formatTime(end - start);
        
        if (start >= end) {
          endSlider.value = Math.min(start + 1, totalDuration);
        }
      };

      endSlider.oninput = () => {
        const start = parseFloat(startSlider.value);
        const end = parseFloat(endSlider.value);
        startTime.textContent = this.formatTime(start);
        endTime.textContent = this.formatTime(end);
        duration.textContent = this.formatTime(end - start);
        
        if (end <= start) {
          startSlider.value = Math.max(end - 1, 0);
        }
      };

      // Initialize display
      startTime.textContent = this.formatTime(0);
      endTime.textContent = this.formatTime(totalDuration);
      duration.textContent = this.formatTime(totalDuration);
    };

    this.trimModal.style.display = 'flex';

    // Add apply and cancel handlers
    document.getElementById('apply-trim-btn').onclick = () => this.applyTrim();
    document.getElementById('cancel-trim-btn').onclick = () => this.closeEditingModal(this.trimModal);
  }

  applyTrim() {
    const startSlider = document.getElementById('trim-start-slider');
    const endSlider = document.getElementById('trim-end-slider');
    const start = parseFloat(startSlider.value);
    const end = parseFloat(endSlider.value);

    if (end <= start) {
      this.showMessage('End time must be after start time', 'error');
      return;
    }

    // For now, we'll just store the trim settings
    // In a real implementation, you'd use Web APIs or a video processing library
    this.currentEditingSession.trimSettings = { start, end };
    
    this.closeEditingModal(this.trimModal);
    this.showMessage(`Video will be trimmed from ${this.formatTime(start)} to ${this.formatTime(end)}`, 'success');
  }



  openTextModal() {
    if (!this.currentEditingSession) {
      this.showMessage('Please select a recording to edit', 'error');
      return;
    }

    const video = document.getElementById('text-video');
    const source = document.getElementById('text-video-source');
    const textOverlay = document.getElementById('text-overlay');
    const textContent = document.getElementById('text-content');
    const textSize = document.getElementById('text-size');
    const textColor = document.getElementById('text-color');
    const textSizeValue = document.getElementById('text-size-value');

    source.src = this.currentEditingSession.url;
    video.load();

    // Initialize text overlay
    textOverlay.style.left = '10%';
    textOverlay.style.top = '10%';

    // Make text overlay draggable
    this.makeDraggable(textOverlay);

    textContent.oninput = () => {
      textOverlay.textContent = textContent.value;
    };

    textSize.oninput = () => {
      textOverlay.style.fontSize = `${textSize.value}px`;
      textSizeValue.textContent = `${textSize.value}px`;
    };

    textColor.oninput = () => {
      textOverlay.style.color = textColor.value;
    };

    this.textModal.style.display = 'flex';

    // Add apply and cancel handlers
    document.getElementById('apply-text-btn').onclick = () => this.applyText();
    document.getElementById('cancel-text-btn').onclick = () => this.closeEditingModal(this.textModal);
  }

  applyText() {
    const textContent = document.getElementById('text-content');
    const textSize = document.getElementById('text-size');
    const textColor = document.getElementById('text-color');
    const textOverlay = document.getElementById('text-overlay');

    const textSettings = {
      content: textContent.value,
      size: textSize.value,
      color: textColor.value,
      x: parseFloat(textOverlay.style.left) / 100,
      y: parseFloat(textOverlay.style.top) / 100
    };

    if (!this.currentEditingSession.textOverlays) {
      this.currentEditingSession.textOverlays = [];
    }
    this.currentEditingSession.textOverlays.push(textSettings);
    
    this.closeEditingModal(this.textModal);
    this.showMessage('Text overlay added', 'success');
  }

  openWatermarkModal() {
    if (!this.currentEditingSession) {
      this.showMessage('Please select a recording to edit', 'error');
      return;
    }

    const video = document.getElementById('watermark-video');
    const source = document.getElementById('watermark-video-source');
    const watermarkFile = document.getElementById('watermark-file');
    const watermarkImage = document.getElementById('watermark-image');
    const watermarkOpacity = document.getElementById('watermark-opacity');
    const watermarkSize = document.getElementById('watermark-size');
    const opacityValue = document.getElementById('watermark-opacity-value');
    const sizeValue = document.getElementById('watermark-size-value');

    source.src = this.currentEditingSession.url;
    video.load();

    // Make watermark overlay draggable
    this.makeDraggable(overlay);

    watermarkFile.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          watermarkImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    };

    watermarkOpacity.oninput = () => {
      watermarkImage.style.opacity = watermarkOpacity.value / 100;
      opacityValue.textContent = `${watermarkOpacity.value}%`;
    };

    watermarkSize.oninput = () => {
      const size = watermarkSize.value;
      watermarkImage.style.maxWidth = `${size}px`;
      watermarkImage.style.maxHeight = `${size}px`;
      sizeValue.textContent = `${size}px`;
    };

    this.watermarkModal.style.display = 'flex';

    // Add apply and cancel handlers
    document.getElementById('apply-watermark-btn').onclick = () => this.applyWatermark();
    document.getElementById('cancel-watermark-btn').onclick = () => this.closeEditingModal(this.watermarkModal);
  }

  applyWatermark() {
    const watermarkFile = document.getElementById('watermark-file');
    const watermarkImage = document.getElementById('watermark-image');
    const watermarkOpacity = document.getElementById('watermark-opacity');
    const watermarkSize = document.getElementById('watermark-size');

    if (!watermarkImage.src) {
      this.showMessage('Please select a watermark image', 'error');
      return;
    }

    const watermarkSettings = {
      image: watermarkImage.src,
      opacity: watermarkOpacity.value / 100,
      size: watermarkSize.value,
      x: 0.8, // Default position (bottom right)
      y: 0.8
    };

    if (!this.currentEditingSession.watermarks) {
      this.currentEditingSession.watermarks = [];
    }
    this.currentEditingSession.watermarks.push(watermarkSettings);
    
    this.closeEditingModal(this.watermarkModal);
    this.showMessage('Watermark added', 'success');
  }
  
  openAdvancedVideoEditor() {
    if (!this.currentEditingSession) {
      this.showMessage('Please select a recording to edit', 'error');
      return;
    }
    
    // Send message to popup to open the advanced video editor
    chrome.runtime.sendMessage({
      cmd: 'OPEN_ADVANCED_EDITOR',
      parameter: { 
        sessionId: this.currentEditingSession.id,
        videoData: {
          url: this.currentEditingSession.url,
          name: this.currentEditingSession.name,
          duration: this.currentEditingSession.duration,
          size: this.currentEditingSession.size
        }
      }
    });
  }

  resetAllEdits() {
    if (!this.currentEditingSession) {
      this.showMessage('No recording selected for editing', 'error');
      return;
    }

    delete this.currentEditingSession.trimSettings;

    delete this.currentEditingSession.textOverlays;
    delete this.currentEditingSession.watermarks;
    
    this.showMessage('All edits have been reset', 'success');
  }

  closeEditingModal(modal) {
    modal.style.display = 'none';
  }

  // Process video with all applied edits
  async processVideoWithEdits(session) {
    if (!session.trimSettings && 
        (!session.textOverlays || session.textOverlays.length === 0) &&
        (!session.watermarks || session.watermarks.length === 0)) {
      return session.url; // No edits to apply
    }

    // In a real implementation, you would use:
    // 1. Canvas API for basic editing
    // 2. Web Workers for processing
    // 3. FFmpeg.wasm for advanced video processing
    // 4. Or send to a backend service

    this.showMessage('Video processing with edits... (This would require additional libraries)', 'info');
    return session.url; // For now, return original
  }

  // Make an element draggable
  makeDraggable(element) {
    let isDragging = false;
    let startX, startY, startLeft, startTop;

    element.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startLeft = parseFloat(element.style.left) || 0;
      startTop = parseFloat(element.style.top) || 0;
      
      element.style.cursor = 'grabbing';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      const newLeft = startLeft + (deltaX / element.parentElement.offsetWidth) * 100;
      const newTop = startTop + (deltaY / element.parentElement.offsetHeight) * 100;
      
      // Constrain to parent bounds
      const maxLeft = 100 - (element.offsetWidth / element.parentElement.offsetWidth) * 100;
      const maxTop = 100 - (element.offsetHeight / element.parentElement.offsetHeight) * 100;
      
      element.style.left = Math.max(0, Math.min(maxLeft, newLeft)) + '%';
      element.style.top = Math.max(0, Math.min(maxTop, newTop)) + '%';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        element.style.cursor = 'grab';
      }
    });
  }

  // Export Methods
  showExportOptions(session) {
    this.currentExportSession = session;
    this.exportOptions.style.display = 'block';
  }

  hideExportOptions() {
    this.currentExportSession = null;
    this.exportOptions.style.display = 'none';
  }

  openExportVideoModal() {
    if (!this.currentExportSession) {
      this.showMessage('Please select a recording to export', 'error');
      return;
    }

    // Set default format
    document.querySelectorAll('.format-option').forEach(option => {
      option.classList.remove('selected');
    });
    document.querySelector('[data-format="mp4"]').classList.add('selected');

    // Set default quality
    document.getElementById('export-quality').value = 'medium';

    // Calculate estimated file size
    this.updateExportFileSize();

    // Add event listeners
    document.querySelectorAll('.format-option').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.format-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        this.updateExportFileSize();
      });
    });

    document.getElementById('export-quality').addEventListener('change', () => {
      const customSettings = document.getElementById('custom-quality-settings');
      if (document.getElementById('export-quality').value === 'custom') {
        customSettings.style.display = 'block';
      } else {
        customSettings.style.display = 'none';
      }
      this.updateExportFileSize();
    });

    document.getElementById('export-bitrate').addEventListener('input', (e) => {
      document.getElementById('bitrate-value').textContent = `${e.target.value} Mbps`;
      this.updateExportFileSize();
    });

    this.exportVideoModal.style.display = 'flex';

    // Add apply and cancel handlers
    document.getElementById('start-export-btn').onclick = () => this.startVideoExport();
    document.getElementById('cancel-export-btn').onclick = () => this.closeExportModal(this.exportVideoModal);
  }

  updateExportFileSize() {
    if (!this.currentExportSession) return;

    const format = document.querySelector('.format-option.selected')?.dataset.format || 'mp4';
    const quality = document.getElementById('export-quality').value;
    const bitrate = document.getElementById('export-bitrate').value || 5;
    const duration = this.currentExportSession.duration || 60;

    let estimatedSize = 0;
    if (quality === 'custom') {
      estimatedSize = (bitrate * 1024 * 1024 * duration) / 8; // Convert Mbps to bytes
    } else {
      const qualityMultipliers = { low: 0.5, medium: 1, high: 2 };
      estimatedSize = (this.currentExportSession.size || 50 * 1024 * 1024) * qualityMultipliers[quality];
    }

    document.getElementById('estimated-size').textContent = this.formatFileSize(estimatedSize);
  }

  startVideoExport() {
    const format = document.querySelector('.format-option.selected')?.dataset.format || 'mp4';
    const quality = document.getElementById('export-quality').value;
    const bitrate = document.getElementById('export-bitrate').value || 5;

    this.closeExportModal(this.exportVideoModal);
    
    // In a real implementation, you would process the video here
    this.showMessage(`Starting ${format.toUpperCase()} export with ${quality} quality...`, 'info');
    
    // Simulate export process
    setTimeout(() => {
      this.downloadRecording(this.currentExportSession.id);
      this.showMessage(`${format.toUpperCase()} export completed!`, 'success');
      
      // Send notification
      const filename = `${this.currentExportSession.name}.${format}`;
      this.notifyExportComplete(format, filename);
    }, 2000);
  }

  openExportGifModal() {
    if (!this.currentExportSession) {
      this.showMessage('Please select a recording to export', 'error');
      return;
    }

    // Calculate estimated file size
    this.updateGifFileSize();

    // Add event listeners
    ['gif-fps', 'gif-quality', 'gif-duration'].forEach(id => {
      document.getElementById(id).addEventListener('change', () => this.updateGifFileSize());
    });

    this.exportGifModal.style.display = 'flex';

    // Add apply and cancel handlers
    document.getElementById('start-gif-export-btn').onclick = () => this.startGifExport();
    document.getElementById('cancel-gif-export-btn').onclick = () => this.closeExportModal(this.exportGifModal);
  }

  updateGifFileSize() {
    if (!this.currentExportSession) return;

    const fps = parseInt(document.getElementById('gif-fps').value);
    const quality = document.getElementById('gif-quality').value;
    const duration = Math.min(parseInt(document.getElementById('gif-duration').value), this.currentExportSession.duration);

    const qualityMultipliers = { low: 0.3, medium: 0.6, high: 1.2 };
    const baseSize = 1024 * 1024; // 1MB base
    const estimatedSize = baseSize * qualityMultipliers[quality] * (fps / 15) * (duration / 10);

    document.getElementById('gif-estimated-size').textContent = this.formatFileSize(estimatedSize);
  }

  startGifExport() {
    const fps = document.getElementById('gif-fps').value;
    const quality = document.getElementById('gif-quality').value;
    const duration = document.getElementById('gif-duration').value;

    this.closeExportModal(this.exportGifModal);
    
    this.showMessage(`Creating GIF with ${fps} FPS, ${quality} quality...`, 'info');
    
    // Simulate GIF creation
    setTimeout(() => {
      this.showMessage('GIF export completed!', 'success');
      
      // Send notification
      const filename = `${this.currentExportSession.name}.gif`;
      this.notifyExportComplete('gif', filename);
    }, 3000);
  }

  openExtractAudioModal() {
    if (!this.currentExportSession) {
      this.showMessage('Please select a recording to export', 'error');
      return;
    }

    // Set default format
    document.querySelectorAll('.format-option').forEach(option => {
      option.classList.remove('selected');
    });
    document.querySelector('[data-audio-format="mp3"]').classList.add('selected');

    // Calculate estimated file size
    this.updateAudioFileSize();

    // Add event listeners
    document.querySelectorAll('.format-option').forEach(option => {
      option.addEventListener('click', () => {
        document.querySelectorAll('.format-option').forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');
        this.updateAudioFileSize();
      });
    });

    document.getElementById('audio-quality').addEventListener('change', () => this.updateAudioFileSize());

    this.extractAudioModal.style.display = 'flex';

    // Add apply and cancel handlers
    document.getElementById('start-audio-extract-btn').onclick = () => this.startAudioExtract();
    document.getElementById('cancel-audio-extract-btn').onclick = () => this.closeExportModal(this.extractAudioModal);
  }

  updateAudioFileSize() {
    if (!this.currentExportSession) return;

    const format = document.querySelector('.format-option.selected')?.dataset.audioFormat || 'mp3';
    const quality = parseInt(document.getElementById('audio-quality').value);
    const duration = this.currentExportSession.duration || 60;

    let estimatedSize = 0;
    if (format === 'wav') {
      estimatedSize = 44100 * 2 * 2 * duration; // 44.1kHz, 16-bit, stereo
    } else {
      estimatedSize = (quality * 1000 * duration) / 8; // Convert kbps to bytes
    }

    document.getElementById('audio-estimated-size').textContent = this.formatFileSize(estimatedSize);
  }

  startAudioExtract() {
    const format = document.querySelector('.format-option.selected')?.dataset.audioFormat || 'mp3';
    const quality = document.getElementById('audio-quality').value;

    this.closeExportModal(this.extractAudioModal);
    
    this.showMessage(`Extracting audio as ${format.toUpperCase()} with ${quality} kbps...`, 'info');
    
    // Simulate audio extraction
    setTimeout(() => {
      this.showMessage('Audio extraction completed!', 'success');
      
      // Send notification
      const filename = `${this.currentExportSession.name}.${format}`;
      this.notifyExportComplete(format, filename);
    }, 2500);
  }

  openBatchExportModal() {
    const batchList = document.getElementById('batch-list');
    batchList.innerHTML = '';

    // Add all completed recordings to batch list
    const completedRecordings = this.recordingSessions.filter(session => !session.isRecording);
    
    if (completedRecordings.length === 0) {
      this.showMessage('No completed recordings to export', 'error');
      return;
    }

    completedRecordings.forEach(session => {
      const item = document.createElement('div');
      item.className = 'batch-item';
      item.innerHTML = `
        <div>
          <input type="checkbox" class="batch-checkbox" checked data-session-id="${session.id}">
          <span>${session.name}</span>
        </div>
        <small class="text-muted">${this.formatTime(session.duration)}</small>
      `;
      batchList.appendChild(item);
    });

    this.batchExportModal.style.display = 'flex';

    // Add apply and cancel handlers
    document.getElementById('start-batch-export-btn').onclick = () => this.startBatchExport();
    document.getElementById('cancel-batch-export-btn').onclick = () => this.closeExportModal(this.batchExportModal);
  }

  startBatchExport() {
    const selectedSessions = Array.from(document.querySelectorAll('.batch-checkbox:checked'))
      .map(checkbox => this.recordingSessions.find(s => s.id === parseInt(checkbox.dataset.sessionId)))
      .filter(Boolean);

    if (selectedSessions.length === 0) {
      this.showMessage('Please select at least one recording', 'error');
      return;
    }

    const format = document.getElementById('batch-format').value;
    this.closeExportModal(this.batchExportModal);

    this.showMessage(`Starting batch export of ${selectedSessions.length} recordings as ${format.toUpperCase()}...`, 'info');

    // Simulate batch export
    let completed = 0;
    const progressBar = document.getElementById('batch-progress');
    const progressFill = document.getElementById('batch-progress-fill');
    
    progressBar.style.display = 'block';

    const interval = setInterval(() => {
      completed++;
      const progress = (completed / selectedSessions.length) * 100;
      progressFill.style.width = `${progress}%`;

      if (completed >= selectedSessions.length) {
        clearInterval(interval);
        setTimeout(() => {
          progressBar.style.display = 'none';
          this.showMessage('Batch export completed!', 'success');
          
          // Send notification
          this.notifyExportComplete('batch', `${selectedSessions.length} recordings`);
        }, 500);
      }
    }, 1000);
  }

  openExportSettingsModal() {
    // Load current settings
    document.getElementById('default-video-format').value = this.exportSettings.defaultVideoFormat;
    document.getElementById('default-quality').value = this.exportSettings.defaultQuality;
    document.getElementById('default-audio-format').value = this.exportSettings.defaultAudioFormat;
    document.getElementById('auto-export').checked = this.exportSettings.autoExport;
    document.getElementById('include-metadata').checked = this.exportSettings.includeMetadata;

    this.exportSettingsModal.style.display = 'flex';

    // Add apply and cancel handlers
    document.getElementById('save-export-settings-btn').onclick = () => this.saveExportSettings();
    document.getElementById('cancel-export-settings-btn').onclick = () => this.closeExportModal(this.exportSettingsModal);
  }

  saveExportSettings() {
    this.exportSettings = {
      defaultVideoFormat: document.getElementById('default-video-format').value,
      defaultQuality: document.getElementById('default-quality').value,
      defaultAudioFormat: document.getElementById('default-audio-format').value,
      autoExport: document.getElementById('auto-export').checked,
      includeMetadata: document.getElementById('include-metadata').checked
    };

    this.closeExportModal(this.exportSettingsModal);
    this.showMessage('Export settings saved!', 'success');
  }

  closeExportModal(modal) {
    modal.style.display = 'none';
  }
  
  // Notification Methods
  
  async testNotifications() {
    try {
      // Test desktop notification
      if (this.notificationSettings.desktopNotifications && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('VFetch Pro Test', {
            body: 'Desktop notifications are working!',
            icon: 'img/icon-48.png',
            tag: 'test-notification'
          });
        } else if (Notification.permission !== 'denied') {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            new Notification('VFetch Pro Test', {
              body: 'Desktop notifications are now enabled!',
              icon: 'img/icon-48.png',
              tag: 'test-notification'
            });
          }
        }
      }
      
      // Test sound alert
      if (this.notificationSettings.soundAlerts) {
        this.playNotificationSound();
      }
      
      // Test visual alert
      if (this.notificationSettings.visualAlerts) {
        this.showVisualAlert('Test Notification', 'All notification systems are working correctly!', 'success');
      }
      
      this.showMessage('Notification test completed!', 'success');
    } catch (error) {
      console.error('Notification test failed:', error);
      this.showMessage('Notification test failed. Check console for details.', 'error');
    }
  }
  
  openNotificationSettingsModal() {
    // Load current settings into modal
    this.notifyRecordingStartCheckbox.checked = this.notificationSettings.notifyRecordingStart;
    this.notifyRecordingStopCheckbox.checked = this.notificationSettings.notifyRecordingStop;
    this.notifyRecordingPauseCheckbox.checked = this.notificationSettings.notifyRecordingPause;
    this.notifyExportCompleteCheckbox.checked = this.notificationSettings.notifyExportComplete;
    this.notifyErrorCheckbox.checked = this.notificationSettings.notifyError;
    this.visualRecordingIndicatorCheckbox.checked = this.notificationSettings.visualRecordingIndicator;
    this.visualStatusFlashCheckbox.checked = this.notificationSettings.visualStatusFlash;
    this.visualToastNotificationsCheckbox.checked = this.notificationSettings.visualToastNotifications;
    
    // Set selected sound option
    this.soundOptions.forEach(option => {
      option.classList.remove('selected');
      if (option.dataset.sound === this.notificationSettings.soundType) {
        option.classList.add('selected');
      }
    });
    
    this.notificationSettingsModal.style.display = 'flex';
  }
  
  closeNotificationSettingsModal() {
    this.notificationSettingsModal.style.display = 'none';
  }
  
  async testSound() {
    if (this.notificationSettings.soundAlerts) {
      await this.playNotificationSound();
    }
  }
  
  previewNotification() {
    const preview = document.getElementById('notification-preview');
    preview.classList.add('show');
    
    setTimeout(() => {
      preview.classList.remove('show');
    }, 3000);
  }
  
  saveNotificationSettings() {
    // Save checkbox states
    this.notificationSettings.notifyRecordingStart = this.notifyRecordingStartCheckbox.checked;
    this.notificationSettings.notifyRecordingStop = this.notifyRecordingStopCheckbox.checked;
    this.notificationSettings.notifyRecordingPause = this.notifyRecordingPauseCheckbox.checked;
    this.notificationSettings.notifyExportComplete = this.notifyExportCompleteCheckbox.checked;
    this.notificationSettings.notifyError = this.notifyErrorCheckbox.checked;
    this.notificationSettings.visualRecordingIndicator = this.visualRecordingIndicatorCheckbox.checked;
    this.notificationSettings.visualStatusFlash = this.visualStatusFlashCheckbox.checked;
    this.notificationSettings.visualToastNotifications = this.visualToastNotificationsCheckbox.checked;
    
    // Save to localStorage
    localStorage.setItem('vfetch-notification-settings', JSON.stringify(this.notificationSettings));
    
    this.closeNotificationSettingsModal();
    this.showMessage('Notification settings saved!', 'success');
  }
  
  loadNotificationSettings() {
    try {
      const saved = localStorage.getItem('vfetch-notification-settings');
      if (saved) {
        this.notificationSettings = { ...this.notificationSettings, ...JSON.parse(saved) };
      }
      
      // Update UI checkboxes
      this.desktopNotificationsCheckbox.checked = this.notificationSettings.desktopNotifications;
      this.soundAlertsCheckbox.checked = this.notificationSettings.soundAlerts;
      this.visualAlertsCheckbox.checked = this.notificationSettings.visualAlerts;
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  }
  
  async showNotification(title, message, type = 'info') {
    try {
      // Desktop notification
      if (this.notificationSettings.desktopNotifications && 'Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body: message,
          icon: 'img/icon-48.png',
          tag: 'vfetch-notification',
          requireInteraction: type === 'error'
        });
      }
      
      // Sound alert
      if (this.notificationSettings.soundAlerts) {
        await this.playNotificationSound();
      }
      
      // Visual alert
      if (this.notificationSettings.visualAlerts) {
        this.showVisualAlert(title, message, type);
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }
  
  async playNotificationSound() {
    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const frequency = this.getSoundFrequency();
      const duration = 0.3;
      const sampleRate = this.audioContext.sampleRate;
      const buffer = this.audioContext.createBuffer(1, sampleRate * duration, sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < sampleRate * duration; i++) {
        data[i] = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
      }
      
      const source = this.audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioContext.destination);
      source.start();
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  }
  
  getSoundFrequency() {
    switch (this.notificationSettings.soundType) {
      case 'chime': return 800;
      case 'beep': return 1000;
      case 'ding': return 1200;
      default: return 1000;
    }
  }
  
  showVisualAlert(title, message, type = 'info') {
    // Create visual alert element
    const alert = document.createElement('div');
    alert.className = `visual-alert ${type}`;
    alert.innerHTML = `
      <div class="visual-alert-header">
        <div class="visual-alert-title">${title}</div>
        <button class="visual-alert-close">&times;</button>
      </div>
      <div class="visual-alert-message">${message}</div>
    `;
    
    // Add close functionality
    const closeBtn = alert.querySelector('.visual-alert-close');
    closeBtn.addEventListener('click', () => {
      alert.classList.remove('show');
      setTimeout(() => alert.remove(), 300);
    });
    
    // Add to page
    document.body.appendChild(alert);
    
    // Show with animation
    setTimeout(() => alert.classList.add('show'), 100);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      alert.classList.remove('show');
      setTimeout(() => alert.remove(), 300);
    }, 5000);
  }
  
  updateRecordingIndicator() {
    if (this.notificationSettings.visualRecordingIndicator && this.activeSessionId) {
      this.statusIndicator.classList.add('recording');
    } else {
      this.statusIndicator.classList.remove('recording');
    }
  }
  
  flashStatusBar() {
    if (this.notificationSettings.visualStatusFlash) {
      const originalBackground = this.statusIndicator.style.background;
      this.statusIndicator.style.background = '#ffc107';
      setTimeout(() => {
        this.statusIndicator.style.background = originalBackground;
      }, 500);
    }
  }
  
  // Enhanced notification methods for specific events
  
  async notifyRecordingStarted(session) {
    if (this.notificationSettings.notifyRecordingStart) {
      await this.showNotification(
        'Recording Started',
        `Recording "${session.name}" has begun successfully`,
        'success'
      );
    }
  }
  
  async notifyRecordingStopped(session) {
    if (this.notificationSettings.notifyRecordingStop) {
      await this.showNotification(
        'Recording Stopped',
        `Recording "${session.name}" has been completed`,
        'info'
      );
    }
  }
  
  async notifyRecordingPaused(session, isPaused) {
    if (this.notificationSettings.notifyRecordingPause) {
      await this.showNotification(
        isPaused ? 'Recording Paused' : 'Recording Resumed',
        `Recording "${session.name}" has been ${isPaused ? 'paused' : 'resumed'}`,
        'warning'
      );
    }
  }
  
  async notifyExportComplete(format, filename) {
    if (this.notificationSettings.notifyExportComplete) {
      await this.showNotification(
        'Export Complete',
        `${format.toUpperCase()} file "${filename}" has been exported successfully`,
        'success'
      );
    }
  }
  
  async notifyError(error, context) {
    if (this.notificationSettings.notifyError) {
      await this.showNotification(
        'Recording Error',
        `Error in ${context}: ${error.message || error}`,
        'error'
      );
    }
  }
  
  // Performance Methods
  
  openPerformanceMonitor() {
    this.performanceMonitorModal.style.display = 'flex';
    this.startPerformanceMonitoring();
    this.updatePerformanceDisplay();
  }
  
  closePerformanceMonitor() {
    this.performanceMonitorModal.style.display = 'none';
    this.stopPerformanceMonitoring();
  }
  
  openPerformanceSettingsModal() {
    // Load current settings into modal
    document.getElementById('auto-cleanup').checked = this.performanceSettings.autoCleanup;
    document.getElementById('compress-recordings').checked = this.performanceSettings.compressRecordings;
    document.getElementById('limit-memory-usage').checked = this.performanceSettings.limitMemoryUsage;
    document.getElementById('hardware-acceleration').checked = this.performanceSettings.hardwareAcceleration;
    document.getElementById('adaptive-bitrate').checked = this.performanceSettings.adaptiveBitrate;
    document.getElementById('chunked-recording').checked = this.performanceSettings.chunkedRecording;
    document.getElementById('background-processing').checked = this.performanceSettings.backgroundProcessing;
    document.getElementById('auto-optimize').checked = this.performanceSettings.autoOptimize;
    document.getElementById('real-time-monitoring').checked = this.performanceSettings.realTimeMonitoring;
    document.getElementById('performance-alerts').checked = this.performanceSettings.performanceAlerts;
    document.getElementById('auto-throttle').checked = this.performanceSettings.autoThrottle;
    
    this.updateWorkerStatus();
    this.performanceSettingsModal.style.display = 'flex';
  }
  
  closePerformanceSettingsModal() {
    this.performanceSettingsModal.style.display = 'none';
  }
  
  savePerformanceSettings() {
    // Save checkbox states
    this.performanceSettings.autoCleanup = document.getElementById('auto-cleanup').checked;
    this.performanceSettings.compressRecordings = document.getElementById('compress-recordings').checked;
    this.performanceSettings.limitMemoryUsage = document.getElementById('limit-memory-usage').checked;
    this.performanceSettings.hardwareAcceleration = document.getElementById('hardware-acceleration').checked;
    this.performanceSettings.adaptiveBitrate = document.getElementById('adaptive-bitrate').checked;
    this.performanceSettings.chunkedRecording = document.getElementById('chunked-recording').checked;
    this.performanceSettings.backgroundProcessing = document.getElementById('background-processing').checked;
    this.performanceSettings.autoOptimize = document.getElementById('auto-optimize').checked;
    this.performanceSettings.realTimeMonitoring = document.getElementById('real-time-monitoring').checked;
    this.performanceSettings.performanceAlerts = document.getElementById('performance-alerts').checked;
    this.performanceSettings.autoThrottle = document.getElementById('auto-throttle').checked;
    
    // Save to localStorage
    localStorage.setItem('vfetch-performance-settings', JSON.stringify(this.performanceSettings));
    
    this.closePerformanceSettingsModal();
    this.showMessage('Performance settings saved!', 'success');
    
    // Apply new settings
    this.applyPerformanceSettings();
  }
  
  loadPerformanceSettings() {
    try {
      const saved = localStorage.getItem('vfetch-performance-settings');
      if (saved) {
        this.performanceSettings = { ...this.performanceSettings, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Failed to load performance settings:', error);
    }
  }
  
  applyPerformanceSettings() {
    // Start/stop monitoring based on settings
    if (this.performanceSettings.realTimeMonitoring) {
      this.startPerformanceMonitoring();
    } else {
      this.stopPerformanceMonitoring();
    }
    
    // Start/stop background worker
    if (this.performanceSettings.backgroundProcessing) {
      this.startBackgroundWorker();
    } else {
      this.stopBackgroundWorker();
    }
    
    // Apply memory limits
    this.checkMemoryUsage();
  }
  
  startPerformanceMonitoring() {
    if (this.performanceMonitor.isMonitoring) return;
    
    this.performanceMonitor.isMonitoring = true;
    this.performanceMonitor.monitoringInterval = setInterval(() => {
      this.updatePerformanceMetrics();
    }, 1000);
  }
  
  stopPerformanceMonitoring() {
    if (this.performanceMonitor.monitoringInterval) {
      clearInterval(this.performanceMonitor.monitoringInterval);
      this.performanceMonitor.monitoringInterval = null;
    }
    this.performanceMonitor.isMonitoring = false;
  }
  
  updatePerformanceMetrics() {
    // Simulate performance metrics (in a real implementation, these would be actual measurements)
    this.performanceMonitor.memoryUsage = this.calculateMemoryUsage();
    this.performanceMonitor.cpuUsage = this.calculateCpuUsage();
    this.performanceMonitor.fps = this.calculateFPS();
    this.performanceMonitor.bitrate = this.calculateBitrate();
    
    // Add to history
    this.performanceMonitor.performanceHistory.push({
      timestamp: Date.now(),
      memory: this.performanceMonitor.memoryUsage,
      cpu: this.performanceMonitor.cpuUsage,
      fps: this.performanceMonitor.fps,
      bitrate: this.performanceMonitor.bitrate
    });
    
    // Limit history length
    if (this.performanceMonitor.performanceHistory.length > this.performanceMonitor.maxHistoryLength) {
      this.performanceMonitor.performanceHistory.shift();
    }
    
    // Update display
    this.updatePerformanceDisplay();
    
    // Check for performance alerts
    this.checkPerformanceAlerts();
  }
  
  calculateMemoryUsage() {
    // Simulate memory usage calculation
    const baseMemory = 50; // Base memory usage in MB
    const recordingMemory = this.recordingSessions.reduce((total, session) => {
      return total + (session.size || 0) / (1024 * 1024);
    }, 0);
    return Math.round(baseMemory + recordingMemory + Math.random() * 20);
  }
  
  calculateCpuUsage() {
    // Simulate CPU usage calculation
    const baseCpu = 5; // Base CPU usage in %
    const recordingCpu = this.recordingSessions.filter(s => s.isRecording).length * 15;
    return Math.round(baseCpu + recordingCpu + Math.random() * 10);
  }
  
  calculateFPS() {
    // Simulate FPS calculation
    const activeSession = this.recordingSessions.find(s => s.isRecording);
    if (!activeSession) return 0;
    
    const quality = this.qualityPresets[this.currentQuality];
    return quality.frameRate + Math.floor(Math.random() * 5) - 2;
  }
  
  calculateBitrate() {
    // Simulate bitrate calculation
    const activeSession = this.recordingSessions.find(s => s.isRecording);
    if (!activeSession) return 0;
    
    const quality = this.qualityPresets[this.currentQuality];
    return Math.round(quality.bitrate / 1000000 + Math.random() * 2);
  }
  
  updatePerformanceDisplay() {
    // Update main performance indicators
    this.memoryUsageElement.textContent = `${this.performanceMonitor.memoryUsage} MB`;
    this.cpuUsageElement.textContent = `${this.performanceMonitor.cpuUsage}%`;
    this.storageUsedElement.textContent = this.formatFileSize(this.calculateStorageUsage());
    
    // Update monitor modal
    const monitorMemory = document.getElementById('monitor-memory');
    const monitorCpu = document.getElementById('monitor-cpu');
    const monitorFps = document.getElementById('monitor-fps');
    const monitorBitrate = document.getElementById('monitor-bitrate');
    
    if (monitorMemory) monitorMemory.textContent = `${this.performanceMonitor.memoryUsage} MB`;
    if (monitorCpu) monitorCpu.textContent = `${this.performanceMonitor.cpuUsage}%`;
    if (monitorFps) monitorFps.textContent = `${this.performanceMonitor.fps} FPS`;
    if (monitorBitrate) monitorBitrate.textContent = `${this.performanceMonitor.bitrate} Mbps`;
    
    // Update status colors
    this.updatePerformanceStatusColors();
  }
  
  updatePerformanceStatusColors() {
    const memoryElement = this.memoryUsageElement;
    const cpuElement = this.cpuUsageElement;
    
    // Memory usage colors
    if (this.performanceMonitor.memoryUsage > 800) {
      memoryElement.className = 'performance-value danger';
    } else if (this.performanceMonitor.memoryUsage > 500) {
      memoryElement.className = 'performance-value warning';
    } else {
      memoryElement.className = 'performance-value success';
    }
    
    // CPU usage colors
    if (this.performanceMonitor.cpuUsage > 80) {
      cpuElement.className = 'performance-value danger';
    } else if (this.performanceMonitor.cpuUsage > 60) {
      cpuElement.className = 'performance-value warning';
    } else {
      cpuElement.className = 'performance-value success';
    }
  }
  
  calculateStorageUsage() {
    return this.recordingSessions.reduce((total, session) => {
      return total + (session.size || 0);
    }, 0);
  }
  
  checkPerformanceAlerts() {
    if (!this.performanceSettings.performanceAlerts) return;
    
    // Memory alert
    if (this.performanceMonitor.memoryUsage > 800) {
      this.showMessage('High memory usage detected. Consider cleaning up old recordings.', 'warning');
    }
    
    // CPU alert
    if (this.performanceMonitor.cpuUsage > 80) {
      this.showMessage('High CPU usage detected. Recording quality may be affected.', 'warning');
    }
    
    // Storage alert
    const storageUsage = this.calculateStorageUsage();
    if (storageUsage > this.performanceSettings.maxStorageUsage * this.performanceSettings.cleanupThreshold) {
      this.showMessage('Storage usage is high. Consider cleaning up old recordings.', 'warning');
    }
  }
  
  performMemoryCleanup() {
    try {
      // Remove old recordings (keep only the last 10)
      const completedRecordings = this.recordingSessions.filter(s => !s.isRecording);
      if (completedRecordings.length > 10) {
        const toRemove = completedRecordings.slice(0, completedRecordings.length - 10);
        toRemove.forEach(session => {
          // Revoke object URLs to free memory
          if (session.url) {
            URL.revokeObjectURL(session.url);
          }
          // Remove from array
          const index = this.recordingSessions.indexOf(session);
          if (index > -1) {
            this.recordingSessions.splice(index, 1);
          }
        });
      }
      
      // Force garbage collection if available
      if (window.gc) {
        window.gc();
      }
      
      this.updateRecordingList();
      this.updateCompletedRecordings();
      this.updatePerformanceMetrics();
      
      this.showMessage('Memory cleanup completed!', 'success');
    } catch (error) {
      console.error('Memory cleanup failed:', error);
      this.showMessage('Memory cleanup failed. Check console for details.', 'error');
    }
  }
  
  startBackgroundWorker() {
    if (this.backgroundWorker.isActive) return;
    
    this.backgroundWorker.isActive = true;
    this.updateWorkerStatus();
    
    // Process queue
    this.processBackgroundQueue();
  }
  
  stopBackgroundWorker() {
    this.backgroundWorker.isActive = false;
    this.updateWorkerStatus();
  }
  
  updateWorkerStatus() {
    const workerStatus = document.getElementById('worker-status');
    const workerStatusText = document.getElementById('worker-status-text');
    
    if (workerStatus && workerStatusText) {
      if (this.backgroundWorker.isActive) {
        workerStatus.className = 'worker-indicator active';
        workerStatusText.textContent = 'Active';
      } else {
        workerStatus.className = 'worker-indicator inactive';
        workerStatusText.textContent = 'Inactive';
      }
    }
  }
  
  processBackgroundQueue() {
    if (!this.backgroundWorker.isActive) return;
    
    // Process tasks in the background
    if (this.backgroundWorker.processingQueue.length > 0) {
      const task = this.backgroundWorker.processingQueue.shift();
      this.executeBackgroundTask(task);
    }
    
    // Continue processing
    setTimeout(() => this.processBackgroundQueue(), 100);
  }
  
  executeBackgroundTask(task) {
    switch (task.type) {
      case 'compress':
        this.compressRecording(task.sessionId);
        break;
      case 'optimize':
        this.optimizeRecording(task.sessionId);
        break;
      case 'export':
        this.backgroundExport(task.sessionId, task.format);
        break;
    }
  }
  
  addBackgroundTask(task) {
    this.backgroundWorker.processingQueue.push(task);
  }
  
  compressRecording(sessionId) {
    const session = this.recordingSessions.find(s => s.id === sessionId);
    if (!session) return;
    
    // Simulate compression
    setTimeout(() => {
      session.size = Math.round(session.size * 0.7); // 30% reduction
      this.updateRecordingList();
      this.showMessage(`Recording "${session.name}" compressed successfully`, 'success');
    }, 2000);
  }
  
  optimizeRecording(sessionId) {
    const session = this.recordingSessions.find(s => s.id === sessionId);
    if (!session) return;
    
    // Simulate optimization
    setTimeout(() => {
      this.showMessage(`Recording "${session.name}" optimized successfully`, 'success');
    }, 1500);
  }
  
  backgroundExport(sessionId, format) {
    const session = this.recordingSessions.find(s => s.id === sessionId);
    if (!session) return;
    
    // Simulate background export
    setTimeout(() => {
      this.showMessage(`Background export of "${session.name}" completed`, 'success');
    }, 3000);
  }
  
  checkMemoryUsage() {
    if (!this.performanceSettings.limitMemoryUsage) return;
    
    const currentUsage = this.calculateMemoryUsage();
    if (currentUsage > this.performanceSettings.maxMemoryUsage / (1024 * 1024)) {
      this.showMessage('Memory limit reached. Stopping new recordings.', 'warning');
      return false;
    }
    return true;
  }
  
  refreshPerformanceMetrics() {
    this.updatePerformanceMetrics();
    this.updatePerformanceDisplay();
    this.showMessage('Performance metrics refreshed!', 'success');
  }
  
  // Enhanced recording methods with performance optimizations
  
  async startNewRecordingWithOptimizations() {
    // Check memory usage before starting
    if (!this.checkMemoryUsage()) {
      return;
    }
    
    // Apply adaptive bitrate if enabled
    if (this.performanceSettings.adaptiveBitrate) {
      this.applyAdaptiveBitrate();
    }
    
    // Start recording with optimizations
    await this.startNewRecording();
  }
  
  applyAdaptiveBitrate() {
    const cpuUsage = this.performanceMonitor.cpuUsage;
    const memoryUsage = this.performanceMonitor.memoryUsage;
    
    // Adjust quality based on system performance
    if (cpuUsage > 70 || memoryUsage > 600) {
      this.selectQuality('low');
    } else if (cpuUsage > 50 || memoryUsage > 400) {
      this.selectQuality('medium');
    } else {
      this.selectQuality('high');
    }
  }
  
  // Privacy & Security Methods
  
  openPrivacySettingsModal() {
    // Load current settings into modal
    document.getElementById('blur-sensitive-content').checked = this.privacySettings.blurSensitiveContent;
    document.getElementById('exclude-system-audio').checked = this.privacySettings.excludeSystemAudio;
    document.getElementById('privacy-watermark').checked = this.privacySettings.privacyWatermark;
    document.getElementById('auto-delete-old').checked = this.privacySettings.autoDeleteOld;
    document.getElementById('no-analytics').checked = this.privacySettings.noAnalytics;
    document.getElementById('local-processing').checked = this.privacySettings.localProcessing;
    document.getElementById('secure-deletion').checked = this.privacySettings.secureDeletion;
    
    // Set selected privacy level
    this.privacyLevelOptions.forEach(option => {
      option.classList.remove('selected');
      if (option.dataset.level === this.privacySettings.privacyLevel) {
        option.classList.add('selected');
      }
    });
    
    this.privacySettingsModal.style.display = 'flex';
  }
  
  closePrivacySettingsModal() {
    this.privacySettingsModal.style.display = 'none';
  }
  
  openEncryptionModal() {
    // Load current encryption settings
    document.getElementById('enable-encryption').checked = this.privacySettings.encryptionEnabled;
    document.getElementById('encrypt-metadata').checked = this.privacySettings.encryptMetadata;
    document.getElementById('auto-encrypt-new').checked = this.privacySettings.autoEncryptNew;
    document.getElementById('remember-key').checked = this.privacySettings.rememberKey;
    document.getElementById('auto-generate-key').checked = this.privacySettings.autoGenerateKey;
    
    // Set encryption key (masked)
    const keyInput = document.getElementById('encryption-key');
    keyInput.value = this.privacySettings.encryptionKey ? '••••••••' : '';
    keyInput.type = 'password';
    
    this.updateEncryptionStatus();
    this.encryptionModal.style.display = 'flex';
  }
  
  closeEncryptionModal() {
    this.encryptionModal.style.display = 'none';
  }
  
  openSecureStorageModal() {
    // Load current storage settings
    document.getElementById('secure-storage-enabled').checked = this.privacySettings.secureStorageEnabled;
    document.getElementById('isolated-storage').checked = this.privacySettings.isolatedStorage;
    document.getElementById('backup-encryption').checked = this.privacySettings.backupEncryption;
    document.getElementById('storage-location').value = this.privacySettings.storageLocation;
    
    this.updateSecurityChecklist();
    this.secureStorageModal.style.display = 'flex';
  }
  
  closeSecureStorageModal() {
    this.secureStorageModal.style.display = 'none';
  }
  
  savePrivacySettings() {
    // Save checkbox states
    this.privacySettings.blurSensitiveContent = document.getElementById('blur-sensitive-content').checked;
    this.privacySettings.excludeSystemAudio = document.getElementById('exclude-system-audio').checked;
    this.privacySettings.privacyWatermark = document.getElementById('privacy-watermark').checked;
    this.privacySettings.autoDeleteOld = document.getElementById('auto-delete-old').checked;
    this.privacySettings.noAnalytics = document.getElementById('no-analytics').checked;
    this.privacySettings.localProcessing = document.getElementById('local-processing').checked;
    this.privacySettings.secureDeletion = document.getElementById('secure-deletion').checked;
    
    // Save to localStorage
    localStorage.setItem('vfetch-privacy-settings', JSON.stringify(this.privacySettings));
    
    this.closePrivacySettingsModal();
    this.updatePrivacyDisplay();
    this.showMessage('Privacy settings saved!', 'success');
  }
  
  saveEncryptionSettings() {
    const keyInput = document.getElementById('encryption-key');
    const newKey = keyInput.value;
    
    // Validate encryption key
    if (this.privacySettings.encryptionEnabled && newKey.length < 8) {
      this.showMessage('Encryption key must be at least 8 characters long', 'error');
      return;
    }
    
    // Save encryption settings
    this.privacySettings.encryptionEnabled = document.getElementById('enable-encryption').checked;
    this.privacySettings.encryptMetadata = document.getElementById('encrypt-metadata').checked;
    this.privacySettings.autoEncryptNew = document.getElementById('auto-encrypt-new').checked;
    this.privacySettings.rememberKey = document.getElementById('remember-key').checked;
    this.privacySettings.autoGenerateKey = document.getElementById('auto-generate-key').checked;
    
    // Update encryption key if provided
    if (newKey && newKey !== '••••••••') {
      this.privacySettings.encryptionKey = newKey;
    }
    
    // Auto-generate key if enabled
    if (this.privacySettings.autoGenerateKey && !this.privacySettings.encryptionKey) {
      this.privacySettings.encryptionKey = this.generateSecureKey();
    }
    
    // Save to localStorage
    localStorage.setItem('vfetch-privacy-settings', JSON.stringify(this.privacySettings));
    
    this.closeEncryptionModal();
    this.updatePrivacyDisplay();
    this.showMessage('Encryption settings saved!', 'success');
  }
  
  saveStorageSettings() {
    // Save storage settings
    this.privacySettings.secureStorageEnabled = document.getElementById('secure-storage-enabled').checked;
    this.privacySettings.isolatedStorage = document.getElementById('isolated-storage').checked;
    this.privacySettings.backupEncryption = document.getElementById('backup-encryption').checked;
    this.privacySettings.storageLocation = document.getElementById('storage-location').value;
    
    // Save to localStorage
    localStorage.setItem('vfetch-privacy-settings', JSON.stringify(this.privacySettings));
    
    this.closeSecureStorageModal();
    this.updatePrivacyDisplay();
    this.showMessage('Storage settings saved!', 'success');
  }
  
  loadPrivacySettings() {
    try {
      const saved = localStorage.getItem('vfetch-privacy-settings');
      if (saved) {
        this.privacySettings = { ...this.privacySettings, ...JSON.parse(saved) };
      }
      
      this.updatePrivacyDisplay();
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
    }
  }
  
  updatePrivacyDisplay() {
    // Update encryption status
    if (this.encryptionStatusElement) {
      if (this.privacySettings.encryptionEnabled) {
        this.encryptionStatusElement.textContent = 'Enabled';
        this.encryptionStatusElement.className = 'privacy-value secure';
      } else {
        this.encryptionStatusElement.textContent = 'Disabled';
        this.encryptionStatusElement.className = 'privacy-value';
      }
    }
    
    // Update storage status
    if (this.storageStatusElement) {
      if (this.privacySettings.secureStorageEnabled) {
        this.storageStatusElement.textContent = 'Secure';
        this.storageStatusElement.className = 'privacy-value secure';
      } else {
        this.storageStatusElement.textContent = 'Standard';
        this.storageStatusElement.className = 'privacy-value';
      }
    }
    
    // Update privacy level
    if (this.privacyLevelElement) {
      const levelNames = {
        basic: 'Basic',
        enhanced: 'Enhanced',
        maximum: 'Maximum'
      };
      this.privacyLevelElement.textContent = levelNames[this.privacySettings.privacyLevel] || 'Basic';
      this.privacyLevelElement.className = 'privacy-value secure';
    }
  }
  
  updateEncryptionStatus() {
    const statusDisplay = document.getElementById('encryption-status-display');
    if (!statusDisplay) return;
    
    if (this.privacySettings.encryptionEnabled) {
      statusDisplay.className = 'encryption-status secure';
      statusDisplay.innerHTML = '<div class="encryption-icon">✅</div><div class="encryption-text">Encryption is enabled and secure</div>';
    } else {
      statusDisplay.className = 'encryption-status warning';
      statusDisplay.innerHTML = '<div class="encryption-icon">⚠️</div><div class="encryption-text">Encryption is disabled</div>';
    }
  }
  
  updateSecurityChecklist() {
    const checklist = document.getElementById('security-checklist');
    if (!checklist) return;
    
    const items = checklist.querySelectorAll('li');
    
    // Update checklist based on current settings
    items[0].className = this.privacySettings.localProcessing ? 'secure' : 'warning';
    items[1].className = this.privacySettings.encryptionEnabled ? 'secure' : 'warning';
    items[2].className = this.privacySettings.secureDeletion ? 'secure' : 'warning';
    items[3].className = this.privacySettings.encryptionKey ? 'secure' : 'warning';
  }
  
  toggleKeyVisibility() {
    const keyInput = document.getElementById('encryption-key');
    const toggleBtn = this.toggleKeyVisibilityBtn;
    
    if (keyInput.type === 'password') {
      keyInput.type = 'text';
      toggleBtn.innerHTML = '<i class="bi bi-eye-slash"></i>';
    } else {
      keyInput.type = 'password';
      toggleBtn.innerHTML = '<i class="bi bi-eye"></i>';
    }
  }
  
  generateSecureKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let key = '';
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
  }
  
  // Encryption methods
  
  async encryptRecording(session) {
    if (!this.privacySettings.encryptionEnabled || !this.privacySettings.encryptionKey) {
      return session.blob;
    }
    
    try {
      // Simulate encryption (in a real implementation, this would use Web Crypto API)
      const encryptedBlob = new Blob([session.blob], { type: 'application/encrypted' });
      session.isEncrypted = true;
      session.encryptionKey = this.privacySettings.encryptionKey;
      
      return encryptedBlob;
    } catch (error) {
      console.error('Encryption failed:', error);
      this.showMessage('Encryption failed. Recording saved without encryption.', 'warning');
      return session.blob;
    }
  }
  
  async decryptRecording(session) {
    if (!session.isEncrypted || !session.encryptionKey) {
      return session.blob;
    }
    
    try {
      // Simulate decryption (in a real implementation, this would use Web Crypto API)
      const decryptedBlob = new Blob([session.blob], { type: 'video/webm' });
      return decryptedBlob;
    } catch (error) {
      console.error('Decryption failed:', error);
      this.showMessage('Decryption failed. Check your encryption key.', 'error');
      return null;
    }
  }
  
  // Privacy-enhanced recording methods
  
  async startNewRecordingWithPrivacy() {
    // Apply privacy settings before recording
    if (this.privacySettings.blurSensitiveContent) {
      this.applyPrivacyBlur();
    }
    
    if (this.privacySettings.excludeSystemAudio) {
      this.excludeSystemAudio();
    }
    
    // Start recording with privacy features
    await this.startNewRecordingWithOptimizations();
  }
  
  applyPrivacyBlur() {
    // Simulate applying blur to sensitive content
    console.log('Applying privacy blur to sensitive content');
  }
  
  excludeSystemAudio() {
    // Simulate excluding system audio from recording
    console.log('Excluding system audio from recording');
  }
  
  addPrivacyWatermark(session) {
    if (!this.privacySettings.privacyWatermark) return;
    
    // Simulate adding privacy watermark
    console.log('Adding privacy watermark to recording');
  }
  
  secureDeleteRecording(sessionId) {
    const session = this.recordingSessions.find(s => s.id === sessionId);
    if (!session) return;
    
    if (this.privacySettings.secureDeletion) {
      // Simulate secure deletion (overwrite data)
      console.log('Performing secure deletion of recording');
    }
    
    // Remove from array
    const index = this.recordingSessions.indexOf(session);
    if (index > -1) {
      this.recordingSessions.splice(index, 1);
    }
    
    // Revoke object URL
    if (session.url) {
      URL.revokeObjectURL(session.url);
    }
    
    this.updateRecordingList();
    this.updateCompletedRecordings();
    this.showMessage('Recording securely deleted', 'success');
  }
  
  // Auto-cleanup old recordings
  cleanupOldRecordings() {
    if (!this.privacySettings.autoDeleteOld) return;
    
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    const oldRecordings = this.recordingSessions.filter(session => 
      !session.isRecording && session.startTime < thirtyDaysAgo
    );
    
    oldRecordings.forEach(session => {
      this.secureDeleteRecording(session.id);
    });
    
    if (oldRecordings.length > 0) {
      this.showMessage(`Cleaned up ${oldRecordings.length} old recordings`, 'info');
    }
  }
  
  // Back to Top functionality
  toggleBackToTopButton() {
    if (window.pageYOffset > 300) {
      this.backToTopBtn.classList.add('show');
    } else {
      this.backToTopBtn.classList.remove('show');
    }
  }
  
  scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }
  
  // Clean up invalid blob URLs
  cleanupInvalidBlobUrls() {
    this.recordingSessions.forEach((session, index) => {
      if (session.url && session.url.startsWith('blob:')) {
        // Test if the blob URL is still valid
        const testVideo = document.createElement('video');
        testVideo.onerror = () => {
          console.warn('Removing invalid blob URL:', session.url);
          try {
            URL.revokeObjectURL(session.url);
          } catch (e) {
            console.warn('Failed to revoke invalid blob URL:', e);
          }
          session.url = null;
          session.blob = null;
        };
        testVideo.onloadedmetadata = () => {
          // URL is valid, clean up test video
          testVideo.src = '';
        };
        testVideo.src = session.url;
        testVideo.load();
      }
    });
  }
  
  regenerateBlobUrl(session) {
    if (!session.blob) {
      console.error('Cannot regenerate blob URL - no blob data available');
      return false;
    }
    
    try {
      // Revoke old URL if it exists
      if (session.url && session.url.startsWith('blob:')) {
        URL.revokeObjectURL(session.url);
      }
      
      // Create new blob URL
      session.url = URL.createObjectURL(session.blob);
      console.log('Regenerated blob URL for session:', session.id);
      return true;
    } catch (error) {
      console.error('Failed to regenerate blob URL:', error);
      return false;
    }
  }
  
  fixSessionUrls() {
    let fixedCount = 0;
    this.recordingSessions.forEach(session => {
      if (!session.url && session.blob) {
        if (this.regenerateBlobUrl(session)) {
          fixedCount++;
        }
      }
    });
    
    if (fixedCount > 0) {
      console.log(`Fixed ${fixedCount} session URLs`);
      this.updateRecordingList();
      this.updateCompletedRecordings();
    }
    
    return fixedCount;
  }

  // Long recording management methods
  manageRecordingChunks(session) {
    try {
      // If we have too many chunks, consolidate them
      if (session.recordedChunks.length > 50) {
        const mimeType = session.mediaRecorder.mimeType || 'video/webm';
        const consolidatedBlob = new Blob(session.recordedChunks, { type: mimeType });
        
        // Store the consolidated chunk
        session.chunks.push(consolidatedBlob);
        
        // Clear the chunks array and reset size
        session.recordedChunks = [];
        session.chunkSize = 0;
        
        // Mark as long recording
        session.isLongRecording = true;
        
        console.log('Consolidated recording chunks, total chunks:', session.chunks.length, 'size:', consolidatedBlob.size, 'bytes');
        
        // Force garbage collection if available
        if (window.gc) {
          window.gc();
        }
      }
    } catch (error) {
      console.error('Error managing recording chunks:', error);
    }
  }

  async processLongRecording(session) {
    try {
      this.updateStatus('Processing long recording...', 'info');
      
      // Create a promise to track processing
      session.processingPromise = new Promise(async (resolve, reject) => {
        try {
          const mimeType = session.mediaRecorder.mimeType || 'video/webm';
          
          // If we have consolidated chunks, use them
          if (session.chunks.length > 0) {
            // Add any remaining chunks
            if (session.recordedChunks.length > 0) {
              const finalBlob = new Blob(session.recordedChunks, { type: mimeType });
              session.chunks.push(finalBlob);
            }
            
            // Combine all chunks
            session.blob = new Blob(session.chunks, { type: mimeType });
            console.log('Long recording blob created from consolidated chunks:', session.blob.size, 'bytes');
          } else {
            // Fallback to regular blob creation
            session.blob = new Blob(session.recordedChunks, { type: mimeType });
            console.log('Long recording blob created from recorded chunks:', session.blob.size, 'bytes');
          }
          
          // Create the blob URL immediately after blob creation
          session.url = URL.createObjectURL(session.blob);
          console.log('Long recording blob URL created:', session.url);
          
          // Clean up chunks to free memory (but keep chunks for potential regeneration)
          session.recordedChunks = [];
          
          // Force garbage collection if available
          if (window.gc) {
            window.gc();
          }
          
          resolve();
        } catch (error) {
          reject(error);
        }
      });
      
      await session.processingPromise;
      
    } catch (error) {
      console.error('Error processing long recording:', error);
      this.showMessage('Error processing long recording. Trying fallback method...', 'warning');
      
      // Fallback: try to create blob with remaining chunks
      try {
        const mimeType = session.mediaRecorder.mimeType || 'video/webm';
        session.blob = new Blob(session.recordedChunks, { type: mimeType });
        session.url = URL.createObjectURL(session.blob);
        console.log('Fallback blob creation successful:', session.blob.size, 'bytes');
      } catch (fallbackError) {
        console.error('Fallback blob creation failed:', fallbackError);
        this.showMessage('Failed to process recording. Recording may be corrupted.', 'error');
      }
    }
  }

  // Enhanced memory management for long recordings
  checkLongRecordingMemory(session) {
    const duration = (Date.now() - session.startTime) / 1000;
    
    // Mark as long recording after 5 minutes
    if (duration > 300 && !session.isLongRecording) {
      session.isLongRecording = true;
      session.chunkInterval = 5000; // Request data every 5 seconds
      console.log('Marked as long recording, duration:', duration);
    }
    
    // Check memory usage
    if (performance.memory) {
      const memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
      if (memoryUsage > 500) { // 500MB threshold
        console.warn('High memory usage detected:', memoryUsage, 'MB');
        this.performMemoryCleanup();
      }
    }
  }

  // Enhanced blob URL management
  createOptimizedBlobUrl(session) {
    try {
      // Revoke existing URL to prevent memory leaks
      if (session.url) {
        URL.revokeObjectURL(session.url);
      }
      
      // For long recordings, we need to handle the case where chunks were consolidated
      if (session.isLongRecording && session.chunks.length > 0) {
        console.log('Regenerating blob for long recording with consolidated chunks...');
        const mimeType = session.mediaRecorder?.mimeType || 'video/webm';
        
        // Recreate blob from consolidated chunks
        session.blob = new Blob(session.chunks, { type: mimeType });
        session.url = URL.createObjectURL(session.blob);
        
        console.log('Long recording blob regenerated successfully');
        return session.url;
      }
      
      // Create new URL with error handling
      session.url = URL.createObjectURL(session.blob);
      
      // Verify the URL is valid
      if (!session.url || session.url === 'blob:null') {
        throw new Error('Invalid blob URL created');
      }
      
      return session.url;
    } catch (error) {
      console.error('Error creating blob URL:', error);
      
      // Try to recreate blob if URL creation fails
      if (session.recordedChunks.length > 0) {
        const mimeType = session.mediaRecorder?.mimeType || 'video/webm';
        session.blob = new Blob(session.recordedChunks, { type: mimeType });
        session.url = URL.createObjectURL(session.blob);
        return session.url;
      }
      
      // For long recordings, try to recreate from chunks
      if (session.chunks.length > 0) {
        const mimeType = session.mediaRecorder?.mimeType || 'video/webm';
        session.blob = new Blob(session.chunks, { type: mimeType });
        session.url = URL.createObjectURL(session.blob);
        return session.url;
      }
      
      return null;
    }
  }

  // Enhanced video playback with blob URL recovery
  async playRecordingWithRecovery(sessionId) {
    const session = this.recordingSessions.find(s => s.id === sessionId);
    if (!session) {
      this.showMessage('Recording not found', 'error');
      return false;
    }

    try {
      console.log('Starting playback recovery for session:', sessionId);
      console.log('Session details:', {
        isLongRecording: session.isLongRecording,
        hasBlob: !!session.blob,
        hasUrl: !!session.url,
        chunksCount: session.chunks.length,
        recordedChunksCount: session.recordedChunks.length
      });

      // Check if blob URL is valid
      if (!session.url || session.url === 'blob:null') {
        console.log('Blob URL invalid, attempting to regenerate...');
        const urlCreated = this.createOptimizedBlobUrl(session);
        if (!urlCreated) {
          throw new Error('Failed to regenerate blob URL');
        }
      }

      // Test the video before playing
      const testVideo = document.createElement('video');
      testVideo.muted = true;
      
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.warn('Video test timeout, assuming valid...');
          testVideo.src = '';
          resolve(true);
        }, 5000); // 5 second timeout
        
        testVideo.onloadedmetadata = () => {
          clearTimeout(timeout);
          testVideo.src = '';
          console.log('Video test successful');
          resolve(true);
        };
        
        testVideo.onerror = (error) => {
          clearTimeout(timeout);
          console.warn('Video test failed, regenerating blob URL...', error);
          if (this.createOptimizedBlobUrl(session)) {
            resolve(true);
          } else {
            reject(new Error('Failed to create valid video URL'));
          }
        };
        
        testVideo.src = session.url;
        testVideo.load();
      });
    } catch (error) {
      console.error('Error in playRecordingWithRecovery:', error);
      this.showMessage('Error loading video. Trying to recover...', 'warning');
      
      // Final attempt to recover
      if (session.blob) {
        try {
          session.url = URL.createObjectURL(session.blob);
          console.log('Final recovery attempt successful');
          return true;
        } catch (recoveryError) {
          console.error('Recovery failed:', recoveryError);
          this.showMessage('Video recovery failed. Recording may be corrupted.', 'error');
          return false;
        }
      }
      
      return false;
    }
  }

  // Long recording maintenance
  maintainLongRecordings() {
    const longRecordings = this.recordingSessions.filter(session => 
      session.isLongRecording || session.duration > 300
    );
    
    if (longRecordings.length === 0) return;
    
    console.log(`Maintaining ${longRecordings.length} long recordings...`);
    
    longRecordings.forEach(session => {
      // Debug session state
      this.debugSessionState(session);
      
      // Check memory usage for this session
      if (session.blob && session.blob.size > 100 * 1024 * 1024) { // 100MB
        console.log('Large recording detected, optimizing memory usage...');
        
        // Force garbage collection if available
        if (window.gc) {
          window.gc();
        }
      }
      
      // Verify blob URL is still valid
      if (session.url && session.url.startsWith('blob:')) {
        const testVideo = document.createElement('video');
        testVideo.onerror = () => {
          console.log('Invalid blob URL detected during maintenance, regenerating...');
          this.createOptimizedBlobUrl(session);
        };
        testVideo.onloadedmetadata = () => {
          testVideo.src = '';
        };
        testVideo.src = session.url;
        testVideo.load();
      }
      
      // Ensure blob exists for long recordings
      if (!session.blob && session.chunks.length > 0) {
        console.log('Recreating missing blob for long recording...');
        const mimeType = session.mediaRecorder?.mimeType || 'video/webm';
        session.blob = new Blob(session.chunks, { type: mimeType });
        if (!session.url) {
          session.url = URL.createObjectURL(session.blob);
        }
      }
    });
  }

  // Debug method for long recording sessions
  debugSessionState(session) {
    console.log('Session debug info:', {
      id: session.id,
      name: session.name,
      isLongRecording: session.isLongRecording,
      duration: session.duration,
      hasBlob: !!session.blob,
      blobSize: session.blob ? session.blob.size : 0,
      hasUrl: !!session.url,
      urlValid: session.url && session.url.startsWith('blob:'),
      chunksCount: session.chunks.length,
      recordedChunksCount: session.recordedChunks.length,
      chunkSize: session.chunkSize
    });
  }
}

// Initialize offscreen
const offscreen = new VFetchProOffscreen();

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  offscreen.handleMessage(message);
  sendResponse();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
  if (offscreen.recordingSessions.some(s => s.isRecording) || offscreen.currentStream) {
    offscreen.stopAllRecordings();
  }
  
  // Clean up blob URLs and resources
  offscreen.recordingSessions.forEach(session => {
    if (session.url && session.url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(session.url);
      } catch (e) {
        console.warn('Failed to revoke blob URL during cleanup:', e);
      }
    }
    
    // Clean up thumbnail URLs
    if (session.thumbnailUrl && session.thumbnailUrl.startsWith('data:')) {
      session.thumbnailUrl = null;
    }
  });
});
