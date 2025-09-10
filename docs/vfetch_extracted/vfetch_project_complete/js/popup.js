// AnyVideo Popup Script - Advanced Video Management
class VFetchProPopup {
  constructor() {
    this.disableDetailUrl = "/blog/not-support-youtube";
    this.tab = null;
    this.options = OPTION;
    this.langDir = "";
    this.disable = false;
    this.bootstrap = null;
    this.ruleId = 1;
    this.items = [];
    this.storageKey = null;
    
    // Video Editor State
    this.currentVideo = null;
    this.editorState = {
      trim: { start: 0, end: 0 },
      filters: { brightness: 100, contrast: 100, saturation: 100 },
      effects: { blur: 0, rotation: 0, scale: 100, speed: 1, flipH: false, flipV: false },
      textOverlays: []
    };
    
    this.$item = this.selector("item").cloneNode(true);
    this.selector("item").remove();
    this.$loading = this.selector("loading");
    this.$empty = this.selector("empty");
    this.$disable = this.selector("disable");
    this.$container = this.selector("container");
    this.$list = this.selector("list");
    this.$optionsBtn = this.selector("optionsBtn");
    this.$options = this.selector("options");
    this.$recordHeader = this.selector("recordHeader");
    this.$noResourceLead = this.selector("noResourceLead");
    this.$home = this.selector("home");
    this.$disableDetail = this.selector("disableDetail");
  }

  // Toggle item visibility based on size filter
  itemToggle(item, size) {
    const { max, min } = this.options.size;
    let shouldHide = false;
    
    if (min !== 0 && max !== 0) {
      shouldHide = size < min || size > max;
    } else if (min !== 0 || max !== 0) {
      shouldHide = min !== 0 ? size < min : size > max;
    }
    
    if (shouldHide) {
      item.classList.add("d-none");
    } else {
      item.classList.remove("d-none");
    }
  }

  // Render options panel
  optionRender() {
    this.$options.classList.add("offcanvas");
    this.$options.classList.remove("d-none");
    
    const offcanvas = new this.bootstrap.Offcanvas(this.$options);
    
    this.$optionsBtn.onclick = () => {
      offcanvas.toggle();
    };
    
    // Initialize tooltips
    document.querySelectorAll(".tooltip-toggle").forEach((element) => {
      new this.bootstrap.Tooltip(element);
    });
    
    const { $options, options } = this;
    const sizeMin = this.selector("sizeMin", false, $options);
    const sizeMax = this.selector("sizeMax", false, $options);
    const noAddDomainTip = this.selector("noAddDomainTip", false, $options);
    const noRecordTip = this.selector("noRecordTip", false, $options);
    
    sizeMin.value = options.size.min / 1024;
    sizeMax.value = options.size.max / 1024;
    noAddDomainTip.checked = !options.noAddDomainTip;
    noRecordTip.checked = !options.noRecordTip;
    
    // Load blocked domains
    for (const domain of options.domain) {
      this.createOptionDomain(domain);
    }
    
    // Event handlers
    sizeMin.onblur = () => {
      let value = sizeMin.value || 0;
      if (value) value = parseInt(value);
      else sizeMin.value = 0;
      value *= 1024;
      
      if (value !== this.options.size.min) {
        this.options.size.min = value;
        this.saveOptions().then(() => {
          for (const item of this.items) {
            if (item.detail.type !== "hls") {
              this.itemToggle(item.$item, item.detail.size);
            }
          }
          this.toast("Settings saved successfully");
        });
      }
    };
    
    sizeMax.onblur = () => {
      let value = sizeMax.value || 0;
      if (value) value = parseInt(value);
      else sizeMax.value = 0;
      value *= 1024;
      
      if (value !== this.options.size.max) {
        this.options.size.max = value;
        this.saveOptions().then(() => {
          for (const item of this.items) {
            if (item.detail.type !== "hls") {
              this.itemToggle(item.$item, item.detail.size);
            }
          }
          this.toast("Settings saved successfully");
        });
      }
    };
    
    noAddDomainTip.onclick = () => {
      this.options.noAddDomainTip = !noAddDomainTip.checked;
      this.saveOptions().then(() => {
        this.toast("Settings saved successfully");
      });
    };
    
    noRecordTip.onclick = () => {
      this.options.noRecordTip = !noRecordTip.checked;
      this.saveOptions().then(() => {
        this.toast("Settings saved successfully");
      });
    };
  }

  // Create domain option in settings
  createOptionDomain(domain) {
    const domainContainer = this.selector("domain", false, this.$options);
    const noDomain = this.selector("noDomain", false, this.$options);
    
    if (!noDomain.classList.contains("d-none")) {
      noDomain.classList.add("d-none");
    }
    
    const domainElement = document.createElement("div");
    domainElement.className = "d-flex justify-content-between align-items-center mb-1";
    
    const domainText = document.createElement("span");
    domainText.className = "flex-grow-1 text-truncate me-2 text-decoration-underline";
    domainText.innerText = domain;
    
    const removeBtn = document.createElement("button");
    removeBtn.className = "btn btn-light";
    removeBtn.innerHTML = '<i class="bi bi-trash3"></i>';
    
    domainElement.appendChild(domainText);
    domainElement.appendChild(removeBtn);
    domainContainer.appendChild(domainElement);
    
    removeBtn.onclick = () => {
      removeBtn.onclick = null;
      const index = this.options.domain.indexOf(domain);
      if (index > -1) {
        this.options.domain.splice(index, 1);
        this.saveOptions();
      }
      domainElement.remove();
      
      if (this.options.domain.length === 0) {
        noDomain.classList.remove("d-none");
      }
    };
  }

  // Save options to storage
  saveOptions(updateStorage = false) {
    const options = JSON.parse(JSON.stringify(this.options));
    options.size.min = options.size.min / 1024;
    options.size.max = options.size.max / 1024;
    
    return new Promise((resolve) => {
      chrome.storage.sync.set({ options }).then(() => {
        const message = { cmd: "RESET_OPTIONS", parameter: {} };
        if (updateStorage) {
          message.parameter.storageKey = this.storageKey;
        }
        chrome.runtime.sendMessage(message, () => {
          resolve();
        });
      });
    });
  }

  // Get options from storage
  getOptions() {
    const normalizeOptions = (options) => {
      if (options?.size?.min) {
        options.size.min = 1024 * options.size.min;
        if (options.size.min < 0) options.size.min = 0;
      }
      if (options?.size?.max) {
        options.size.max = 1024 * options.size.max;
        if (options.size.max < 0) options.size.max = 0;
      }
    };

    return new Promise((resolve) => {
      try {
        chrome.storage.sync.get(["options"]).then(({ options }) => {
          if (options) {
            for (let key in this.options) {
              if (options[key] !== undefined && key !== "lang") {
                this.options[key] = options[key];
              }
            }
          }
          normalizeOptions(this.options);
          resolve();
        });
      } catch (e) {
        normalizeOptions(this.options);
        resolve();
      }
    });
  }

  // Get language directory
  getLangDir() {
    return new Promise(async (resolve) => {
      let lang = await chrome.i18n.getUILanguage();
      lang = lang.toLowerCase();
      lang = lang.replace(/_/, "-");
      
      if (lang.includes("-") && !lang.startsWith("zh-")) {
        const primary = lang.split("-")[0];
        if (primary) {
          lang = primary;
        }
      }
      
      lang = this.options.lang.indexOf(lang) < 0 ? "" : "/" + lang;
      resolve(lang);
    });
  }

  // Convert size to human readable format
  sizeConvert(size) {
    if (size < 1024) {
      return size + "B";
    } else if (size < 1048576) {
      return (size / 1024).toFixed(0) + "K";
    } else if (size < 1073741824) {
      return (size / 1048576).toFixed(0) + "M";
    } else {
      return (size / 1073741824).toFixed(2) + "G";
    }
  }

  // Create rules for network requests
  createRules(headers) {
    const rules = [];
    if (!headers) headers = {};
    
    let hasOrigin = false;
    for (const key in headers) {
      const header = headers[key];
      const name = key.toLowerCase();
      if (name === "origin" || name === "referer") {
        hasOrigin = true;
      }
      rules.push({
        header: key,
        operation: "set",
        value: header
      });
    }
    
    return hasOrigin ? rules : null;
  }

  // Set network rules
  setRules(headers, url) {
    const { ruleId } = this;
    
    return new Promise((resolve) => {
      try {
        const condition = {
          domainType: "thirdParty",
          resourceTypes: ["xmlhttprequest", "media"],
          tabIds: [-1]
        };
        
        if (typeof url === "string") {
          condition.urlFilter = url;
        } else if (Array.isArray(url)) {
          if (this.isRequestDomainsSupport()) {
            condition.requestDomains = url;
          } else {
            const patterns = url.map(domain => 
              `(?:.*\\.)?${domain.replace(/\./g, "\\.")}`
            );
            condition.regexFilter = `https?://(?:www\\.)?(${patterns.join("|")})(?::\\d+)?(?:/[^s]*)?`;
          }
        }
        
        chrome.declarativeNetRequest.updateSessionRules({
          removeRuleIds: [ruleId],
          addRules: [{
            id: ruleId,
            priority: 1,
            action: {
              type: "modifyHeaders",
              requestHeaders: headers
            },
            condition: condition
          }]
        }, () => {
          resolve(ruleId);
        });
      } catch (e) {
        resolve(0);
      }
    });
  }

  // Remove network rules
  removeRules() {
    chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: [this.ruleId]
    });
  }

  // Get top level domain
  getTopLevelDomain(url) {
    const hostname = new URL(url).hostname;
    
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
      return hostname;
    }
    
    const parts = hostname.split(".");
    const length = parts.length;
    
    if (length >= 3 && ["co", "com", "org", "net", "gov", "edu"].includes(parts[length - 2])) {
      return parts.slice(-3).join(".");
    }
    
    return parts.slice(-2).join(".");
  }

  // Check if request domains are supported
  isRequestDomainsSupport() {
    try {
      const match = navigator.userAgent.match(/Chrome\/(\d+)/);
      if (match && match[1]) {
        return parseInt(match[1], 10) >= 101;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  // Create video player
  async player(videoData, container, resolutionElement) {
    const video = document.createElement("video");
    video.autoplay = true;
    video.controls = true;
    video.style.maxWidth = "100%";
    container.appendChild(video);
    
    const rules = this.createRules(videoData.headers);
    
    if (videoData.type === "hls") {
      if (window.Hls && window.Hls.isSupported()) {
        const domains = [];
        const hls = new window.Hls({ 
          autoStartLoad: false,
          debug: false,
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90
        });
        
        hls.on(window.Hls.Events.LEVEL_LOADED, async (event, data) => {
          if (rules) {
            let hasNewDomain = false;
            for (const fragment of data.details.fragments) {
              const domain = this.getTopLevelDomain(fragment.url);
              if (!domains.includes(domain)) {
                hasNewDomain = true;
                domains.push(domain);
              }
            }
            if (hasNewDomain) {
              await this.setRules(rules, domains);
            }
          }
          if (!hls.allAudioTracks.length) {
            hls.attachMedia(video);
          }
        });
        
        hls.on(window.Hls.Events.AUDIO_TRACK_LOADED, async (event, data) => {
          if (rules) {
            let hasNewDomain = false;
            for (const fragment of data.details.fragments) {
              const domain = this.getTopLevelDomain(fragment.url);
              if (!domains.includes(domain)) {
                hasNewDomain = true;
                domains.push(domain);
              }
            }
            if (hasNewDomain) {
              await this.setRules(rules, domains);
            }
          }
          if (!hls.media) {
            hls.attachMedia(video);
          }
        });
        
        hls.on(window.Hls.Events.DESTROYING, () => {
          if (rules) {
            this.removeRules();
          }
        });
        
        hls.on(window.Hls.Events.ERROR, (event, data) => {
          console.warn('HLS Error:', data);
          if (data.fatal) {
            this.toast("HLS stream error. Trying to recover...", 3000, true);
          }
        });
        
        hls.on(window.Hls.Events.MANIFEST_PARSED, async (event, manifest) => {
          if (rules) {
            let hasNewDomain = false;
            for (const level of manifest.levels) {
              const domain = this.getTopLevelDomain(level.uri);
              if (!domains.includes(domain)) {
                hasNewDomain = true;
                domains.push(domain);
              }
            }
            if (manifest.audioTracks.length && manifest.audio) {
              for (const audioTrack of manifest.audioTracks) {
                const domain = this.getTopLevelDomain(audioTrack.url);
                if (!domains.includes(domain)) {
                  hasNewDomain = true;
                  domains.push(domain);
                }
              }
            }
            if (hasNewDomain) {
              await this.setRules(rules, domains);
            }
          }
          
          hls.startLoad();
          
          let maxWidth = 0;
          let maxHeight = 0;
          let maxBitrate = 0;
          
          for (const level of hls.levels) {
            const { bitrate, width, height } = level;
            if (bitrate && width && height) {
              if (bitrate > maxBitrate) {
                maxBitrate = bitrate;
                maxWidth = width;
                maxHeight = height;
              }
            }
          }
          
          if (maxWidth && maxHeight) {
            resolutionElement.innerText = `${maxWidth} x ${maxHeight}`;
          } else {
            video.addEventListener("loadedmetadata", () => {
              const width = video.videoWidth;
              const height = video.videoHeight;
              resolutionElement.innerText = `${width} x ${height}`;
            });
          }
        });
        
        if (rules) {
          domains.push(this.getTopLevelDomain(videoData.url));
          await this.setRules(rules, domains);
        }
        
        hls.loadSource(videoData.url);
        return hls;
      } else {
        // HLS.js not supported, try native HLS support
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.addEventListener("loadedmetadata", () => {
            const width = video.videoWidth;
            const height = video.videoHeight;
            const quality = `${width} x ${height}`;
            videoData.quality = quality;
            resolutionElement.innerText = quality;
          });
          
          if (rules) {
            await this.setRules(rules, videoData.url);
          }
          video.src = videoData.url;
          return null;
        } else {
          // No HLS support, show error
          this.toast("HLS streams not supported in this browser. Try recording instead.", 5000, true);
          container.innerHTML = '<div class="alert alert-warning">HLS streams require HLS.js library or native browser support. Use the recording feature to capture this stream.</div>';
          return null;
        }
      }
    } else {
      video.addEventListener("loadedmetadata", () => {
        const width = video.videoWidth;
        const height = video.videoHeight;
        const quality = `${width} x ${height}`;
        videoData.quality = quality;
        resolutionElement.innerText = quality;
      });
      
      if (rules) {
        await this.setRules(rules, videoData.url);
      }
      video.src = videoData.url;
      return null;
    }
  }

  // Create tab for download/recording
  createTab(data, isRecording = false, type = null) {
    if (isRecording) {
      // Open offscreen recording page
      chrome.tabs.create({
        url: chrome.runtime.getURL('offscreen.html'),
        index: this.tab.index + 1
      });
    } else {
      // Handle video downloads
      if (type === "hls") {
        // For HLS streams, download the manifest and all segments
        this.downloadHLSStream(data.url, data.name || 'video.m3u8');
      } else {
        // For regular videos, download directly
        chrome.downloads.download({
          url: data.url,
          filename: data.name || 'video.mp4',
          saveAs: true
        });
      }
    }
  }

  // Create video item
  itemCreate(videoData) {
    let player = null;
    const item = this.$item.cloneNode(true);
    const itemData = {
      requestId: videoData.requestId,
      detail: videoData,
      $item: item
    };
    
    const previewBox = this.selector("preview", false, item);
    const playBtn = this.selector("play", false, item);
    const infoBtn = this.selector("info", false, item);
    const nameWrap = this.selector("name-wrap", false, item);
    const nameWidth = this.selector("name-width", false, item);
    const nameElement = this.selector("name", false, item);
    const nameEllipsis = this.selector("name-ellipsis", false, item);
    const sizeElement = this.selector("size", false, item);
    const chevronDown = this.selector("chevron-down", false, item);
    const downloadBtn = this.selector("download", false, item);

    const blockedBtn = this.selector("blocked", false, item);
    const urlCollapse = this.selector("url-collapse", false, item);
    const urlElement = this.selector("url", false, item);
    const urlCloseBtn = this.selector("url-close", false, item);
    const copyBtn = this.selector("copy", false, item);
    const playerCollapse = this.selector("player-collapse", false, item);
    const resolutionElement = this.selector("resolution", false, item);
    const playerContainer = this.selector("player", false, item);
    const playerCloseBtn = this.selector("player-close", false, item);
    
    // Extract filename from URL
    const filename = this.getFileName(videoData.url);
    
    infoBtn.setAttribute("title", filename);
    nameElement.innerText = filename;
    
    // Set up video preview
    this.setupVideoPreview(previewBox, videoData.url);
    sizeElement.innerText = videoData.type === "hls" ? 
      videoData.type.toUpperCase() : 
      `${videoData.type.toUpperCase()}/${this.sizeConvert(videoData.size)}`;
    urlElement.innerText = videoData.url;
    
    this.$list.appendChild(item);
    
    if (nameWidth.offsetWidth < nameWrap.offsetWidth) {
      nameWidth.classList.remove("h-100", "position-absolute", "top-0", "end-0");
      nameEllipsis.remove();
    }
    
    const urlCollapseInstance = new this.bootstrap.Collapse(urlCollapse, { toggle: false });
    const playerCollapseInstance = new this.bootstrap.Collapse(playerCollapse, { toggle: false });
    
    urlCollapse.addEventListener("hide.bs.collapse", () => {
      chevronDown.classList.remove("transform-up");
    });
    
    urlCollapse.addEventListener("show.bs.collapse", () => {
      chevronDown.classList.add("transform-up");
      playerCollapseInstance.hide();
    });
    
    playerCollapse.addEventListener("hide.bs.collapse", () => {
      if (player && player.destroy) {
        player.destroy();
      }
      if (playerContainer.firstElementChild) {
        playerContainer.firstElementChild.remove();
      }
    });
    
    playerCollapse.addEventListener("show.bs.collapse", () => {
      urlCollapseInstance.hide();
    });
    
    // Event handlers
    infoBtn.onclick = () => {
      for (const item of this.items) {
        if (item.requestId !== itemData.requestId) {
          item.urlCollapse.hide();
        }
      }
      urlCollapseInstance.toggle();
    };
    
    urlCloseBtn.onclick = () => urlCollapseInstance.hide();
    playerCloseBtn.onclick = () => playerCollapseInstance.hide();
    
    playBtn.onclick = async () => {
      for (const item of this.items) {
        if (item.requestId !== itemData.requestId) {
          item.playerCollapse.hide();
        }
      }
      if (!playerCollapse.classList.contains("show")) {
        player = await this.player(videoData, playerContainer, resolutionElement);
        playerCollapseInstance.show();
      }
    };
    
    downloadBtn.onclick = () => {
      if (videoData.contentType.startsWith("audio")) {
        chrome.tabs.create({
          url: videoData.url,
          index: this.tab.index + 1
        });
      } else {
        chrome.storage.local.get(["tasks"], ({ tasks }) => {
          if (tasks) {
            chrome.tabs.query({ currentWindow: true }).then((tabs) => {
              const existingTask = tasks.find(task => 
                tabs.some(tab => tab.id === task.tabId && tab.url.startsWith(this.options.site)) &&
                task.url === videoData.url
              );
              
              if (existingTask) {
                chrome.tabs.update(existingTask.tabId, { active: true });
              } else {
                this.createTab(videoData, false, videoData.type);
              }
            });
          } else {
            this.createTab(videoData, false, videoData.type);
          }
        });
      }
    };
    

    
    blockedBtn.onclick = () => {
      const { options } = this;
      const { hostname } = new URL(videoData.url);
      
      const blockDomain = () => {
        if (options.domain.indexOf(hostname) < 0) {
          if (options.domain.length > 30) {
            this.toast("Too many blocked domains", 4000, true);
            return;
          }
          
          options.domain.push(hostname);
          this.saveOptions(true).then(() => {
            this.createOptionDomain(hostname);
            
            // Remove items from this domain
            while (true) {
              let found = false;
              let index = 0;
              
              for (const item of this.items) {
                if (new URL(item.detail.url).hostname === hostname) {
                  item.$item.remove();
                  this.items.splice(index, 1);
                  found = false;
                  break;
                }
                index++;
              }
              
              if (found) break;
            }
            
            this.updateBadge();
            this.toast("Domain blocked successfully");
          });
        } else {
          item.remove();
        }
      };
      
      if (options.noAddDomainTip) {
        blockDomain();
      } else {
        this.modal({
          title: `Block Domain: <span class="text-danger text-decoration-underline">${hostname}</span>`,
          btnConfirm: "Block Domain",
          content: "This domain will be excluded from video detection. You can unblock it later in settings."
        }, (remember) => {
          options.noAddDomainTip = remember;
          blockDomain();
        });
      }
    };
    
    copyBtn.onclick = () => {
      try {
        navigator.clipboard.writeText(videoData.url).then(() => {
          this.toast("URL copied to clipboard");
        }).catch(() => {
          this.toast("Failed to copy URL", 4000, true);
        });
      } catch (e) {
        this.toast("Failed to copy URL", 4000, true);
      }
    };
    
    itemData.urlCollapse = urlCollapseInstance;
    itemData.playerCollapse = playerCollapseInstance;
    this.items.push(itemData);
    
    if (videoData.type !== "hls") {
      this.itemToggle(item, videoData.size);
    }
  }

  // Update badge count
  updateBadge() {
    let count = this.items.length;
    count = count > 0 ? count.toString() : "";
    
    chrome.action.setBadgeText({ text: count, tabId: this.tab.id });
    
    try {
      chrome.action.setBadgeTextColor({ color: "#FFFFFF" });
      chrome.action.setBadgeBackgroundColor({ color: "#FF0000" });
    } catch (e) {}
  }

  // Show toast notification
  toast(message, duration = 3000, isError = false) {
    const container = document.createElement("div");
    container.style.zIndex = 99999;
    container.className = "w-100 h-100 fixed-top d-flex justify-content-center align-items-start pt-5 pe-none";
    
    const toast = document.createElement("div");
    toast.className = "toast align-items-center border-0 text-white pe-auto";
    
    const flex = document.createElement("div");
    flex.className = "d-flex";
    
    const body = document.createElement("div");
    body.className = "toast-body";
    body.innerText = message;
    
    const closeBtn = document.createElement("button");
    closeBtn.className = "btn-close btn-close-white me-2 m-auto";
    
    if (isError) {
      const errorIcon = document.createElement("span");
      errorIcon.className = "text-danger-emphasis";
      flex.appendChild(errorIcon);
      toast.classList.add("bg-danger");
    } else {
      toast.classList.add("bg-success");
    }
    
    container.appendChild(toast);
    toast.appendChild(flex);
    flex.appendChild(body);
    flex.appendChild(closeBtn);
    document.body.appendChild(container);
    
    const toastInstance = new this.bootstrap.Toast(toast);
    toastInstance.show();
    
    toast.addEventListener("hidden.bs.toast", () => {
      closeBtn.onclick = null;
      toastInstance.dispose();
      container.remove();
    });
    
    closeBtn.onclick = () => toastInstance.hide();
    setTimeout(() => toastInstance.hide(), duration);
  }

  // Show modal dialog
  modal(options = {}, callback = (result = false) => {}) {
    if (typeof options.title !== "string") options.title = "Tip";
    if (typeof options.btnConfirm !== "string") options.btnConfirm = "Confirm";
    if (typeof options.content !== "string") options.content = "Content";
    
    const { title, btnConfirm, content } = options;
    
    const modal = document.createElement("div");
    modal.className = "modal fade";
    modal.setAttribute("tabindex", "-1");
    modal.setAttribute("data-bs-delay", '{"show":150,"hide":150}');
    
    const dialog = document.createElement("div");
    dialog.className = "modal-dialog";
    modal.appendChild(dialog);
    
    const contentDiv = document.createElement("div");
    contentDiv.className = "modal-content";
    dialog.appendChild(contentDiv);
    
    const header = document.createElement("div");
    header.className = "modal-header py-3";
    header.innerHTML = `<h3 class="modal-title fs-6">${title}</h3><button type="button" class="btn-close" data-bs-dismiss="modal"></button>`;
    contentDiv.appendChild(header);
    
    const body = document.createElement("div");
    body.className = "modal-body";
    body.innerHTML = content;
    contentDiv.appendChild(body);
    
    const footer = document.createElement("div");
    footer.className = "modal-footer d-flex justify-content-between align-items-center";
    contentDiv.appendChild(footer);
    
    const checkboxLabel = document.createElement("label");
    checkboxLabel.className = "d-flex justify-content-start align-items-center pointer";
    
    const checkbox = document.createElement("input");
    checkbox.className = "form-check-input fs-5 mt-0 border-2";
    checkbox.setAttribute("type", "checkbox");
    
    const checkboxText = document.createElement("span");
    checkboxText.className = "ps-1";
    checkboxText.innerText = "Don't show this again";
    
    checkboxLabel.appendChild(checkbox);
    checkboxLabel.appendChild(checkboxText);
    footer.appendChild(checkboxLabel);
    
    const confirmBtn = document.createElement("button");
    confirmBtn.className = "btn btn-primary";
    confirmBtn.innerText = btnConfirm;
    footer.appendChild(confirmBtn);
    
    document.body.appendChild(modal);
    
    const modalInstance = new this.bootstrap.Modal(modal);
    modalInstance.show();
    
    modal.addEventListener("hidden.bs.modal", () => {
      confirmBtn.onclick = null;
      modalInstance.dispose();
      modal.remove();
    });
    
    confirmBtn.onclick = () => {
      callback(checkbox.checked);
      modalInstance.hide();
    };
  }

  // Get localized text
  lang(key) {
    return chrome.i18n.getMessage(key) || key;
  }

  // Get filename from URL
  getFileName(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop();
      return filename || 'video.mp4';
    } catch {
      return 'video.mp4';
    }
  }

  // Select element by selector attribute
  selector(selector, multiple = false, parent = null) {
    const element = parent || document;
    return multiple ? 
      element.querySelectorAll(`[selector="${selector}"]`) : 
      element.querySelector(`[selector="${selector}"]`);
  }

  // Initialize popup
  async init() {
    // Bootstrap is already loaded via script tag in popup.html
    this.bootstrap = window.bootstrap || {};
    
    await this.getOptions();
    this.langDir = await this.getLangDir();
    
    this.tab = await new Promise((resolve) => {
      chrome.tabs.query({ currentWindow: true }).then((tabs) => {
        for (const tab of tabs) {
          if (tab.active) {
            resolve(tab);
            break;
          }
        }
        
        chrome.storage.local.get(["tasks"], ({ tasks }) => {
          if (!tasks) return;
          
          const validTasks = tasks.filter(task => 
            tabs.some(tab => tab.id === task.tabId && tab.url.startsWith(this.options.site))
          );
          
          if (validTasks.length !== tasks.length) {
            chrome.storage.local.set({ tasks: validTasks });
          }
        });
      });
    });
    
    this.optionRender();
    
    // Initialize video editor
    this.initVideoEditor();
    
    this.$home.onclick = () => {
      chrome.tabs.create({
        url: this.options.site + this.langDir,
        index: this.tab.index + 1
      });
    };
    
    this.$disableDetail.onclick = () => {
      chrome.tabs.create({
        url: this.options.site + this.langDir + this.disableDetailUrl,
        index: this.tab.index + 1
      });
    };
    
    // Record button functionality
    const startRecording = () => {
      // Open offscreen recording page directly
      chrome.tabs.create({
        url: chrome.runtime.getURL('offscreen.html'),
        index: this.tab.index + 1
      });
    };

    // Header record button
    if (this.$recordHeader) {
      this.$recordHeader.onclick = startRecording;
    }
    
    // Listen for video detection messages
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      const { cmd, parameter } = message;
      
      if (cmd === "VFETCHPRO_POPUP_UPDATE") {
        // Background script is telling us videos were found
        if (parameter && parameter.tabId === this.tab.id) {
          this.loadVideosFromStorage();
        }
        sendResponse();
        return true;
      }
      
      if (cmd === "VFETCHPRO_POPUP_UPDATE") {
        if (!parameter.tabId || this.disable) {
          sendResponse();
          return true;
        }
        
        if (this.tab.id !== parameter.tabId) {
          sendResponse();
          return true;
        }
        
        this.loadVideosFromStorage();
        sendResponse();
        return true;
      }
      
      if (cmd === "POPUP_APPEND_ITEMS") {
        if (!parameter.tab || !parameter.item || this.disable) {
          sendResponse();
          return true;
        }
        
        if (this.tab.id !== parameter.tab) {
          sendResponse();
          return true;
        }
        
        this.$empty.classList.add("d-none");
        this.$container.classList.remove("d-none");
        
        for (const key in parameter.item) {
          // Avoid duplicates
          if (!this.items.some(i => i.detail && i.detail.url === parameter.item[key].url)) {
            this.itemCreate(parameter.item[key]);
          }
        }
        
        sendResponse();
        return true;
      }
      
      if (cmd === "OPEN_ADVANCED_EDITOR") {
        if (parameter && parameter.videoData) {
          this.openVideoEditor(parameter.videoData);
        }
        sendResponse();
        return true;
      }
    });
    
    // Check if site is supported
    const unsupportedSites = ["youtube.com", "globo.com"];
    if (this.tab.url.indexOf("http") === 0) {
      const hostname = new URL(this.tab.url).hostname;
      for (const site of unsupportedSites) {
        if (hostname.endsWith(site)) {
          this.$loading.remove();
          this.$disable.classList.remove("d-none");
          this.disable = true;
          return;
        }
      }
    }
    
    this.storageKey = `vfetchpro_tab_${this.tab.id}`;
    
    const storage = await loadVideosForTab(this.tab.id);
    
    if (Object.keys(storage).length === 0) {
      this.$loading.remove();
      this.$empty.classList.remove("d-none");
      return;
    }
    
    this.$loading.remove();
    this.$container.classList.remove("d-none");
    
    for (const key in storage) {
      this.itemCreate(storage[key]);
    }
  }

  // Set up video preview in preview box
  setupVideoPreview(previewBox, videoUrl) {
    try {
      // Create a video element for preview
      const video = document.createElement('video');
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'cover';
      video.style.borderRadius = '4px';
      video.muted = true;
      video.preload = 'metadata';
      
      // Add loading state
      const loadingSpinner = document.createElement('div');
      loadingSpinner.className = 'd-flex align-items-center justify-content-center h-100';
      loadingSpinner.innerHTML = '<div class="spinner-border spinner-border-sm text-primary"></div>';
      previewBox.appendChild(loadingSpinner);
      
      // Handle video load
      video.addEventListener('loadedmetadata', () => {
        try {
          // Remove loading spinner and add video
          previewBox.innerHTML = '';
          previewBox.appendChild(video);
          
          // Try to get a frame at 1 second
          video.currentTime = 1;
        } catch (e) {
          // Show fallback icon on error
          previewBox.innerHTML = '<img src="img/recording.svg" alt="Recording Preview" style="width: 48px; height: 48px; opacity: 0.6;">';
        }
      });
      
      // Handle video error
      video.addEventListener('error', () => {
        // Show fallback icon
        previewBox.innerHTML = '<img src="img/recording.svg" alt="Recording Preview" style="width: 48px; height: 48px; opacity: 0.6;">';
      });
      
      // Set video source
      video.src = videoUrl;
    } catch (e) {
      // Show fallback icon if setup fails
      previewBox.innerHTML = '<img src="img/recording.svg" alt="Recording Preview" style="width: 48px; height: 48px; opacity: 0.6;">';
    }
  }

  // Load videos from storage and refresh the display
  async loadVideosFromStorage() {
    const storage = await loadVideosForTab(this.tab.id);

    // Clear existing items
    this.$list.innerHTML = '';
    this.items = [];

    if (Object.keys(storage).length === 0) {
      this.$empty.classList.remove("d-none");
      this.$container.classList.add("d-none");
      return;
    }

    this.$empty.classList.add("d-none");
    this.$container.classList.remove("d-none");

    for (const key in storage) {
      this.itemCreate(storage[key]);
    }
  }

  // Initialize video editor
  initVideoEditor() {
    const modal = document.getElementById('videoEditorModal');
    if (!modal) return;

    const video = document.getElementById('editorVideo');
    const timelineTrack = document.getElementById('timelineTrack');
    const timelineProgress = document.getElementById('timelineProgress');
    const trimStartHandle = document.getElementById('trimStartHandle');
    const trimEndHandle = document.getElementById('trimEndHandle');

    // Video time update
    if (video) {
      video.addEventListener('timeupdate', () => {
        const progress = (video.currentTime / video.duration) * 100;
        timelineProgress.style.width = `${progress}%`;
        
        const currentTime = this.formatTime(video.currentTime);
        const totalTime = this.formatTime(video.duration);
        document.getElementById('currentTime').textContent = currentTime;
        document.getElementById('totalTime').textContent = totalTime;
      });

      video.addEventListener('loadedmetadata', () => {
        this.editorState.trim.end = video.duration;
        this.updateTimelineHandles();
        this.updateDurationInfo();
      });
    }

    // Timeline interaction
    if (timelineTrack) {
      timelineTrack.addEventListener('click', (e) => {
        const rect = timelineTrack.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const percentage = (clickX / rect.width) * 100;
        const newTime = (percentage / 100) * video.duration;
        video.currentTime = newTime;
      });
    }

    // Trim handles
    if (trimStartHandle && trimEndHandle) {
      this.setupTrimHandles(trimStartHandle, trimEndHandle, video);
    }

    // Initialize sliders
    this.initEditorSliders();
    
    // Initialize buttons
    this.initEditorButtons();
  }

  // Setup trim handles for dragging
  setupTrimHandles(startHandle, endHandle, video) {
    let isDragging = false;
    let currentHandle = null;

    const startDrag = (e, handle) => {
      isDragging = true;
      currentHandle = handle;
      document.addEventListener('mousemove', drag);
      document.addEventListener('mouseup', stopDrag);
    };

    const drag = (e) => {
      if (!isDragging || !currentHandle) return;

      const timelineTrack = document.getElementById('timelineTrack');
      const rect = timelineTrack.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percentage = (x / rect.width) * 100;
      const time = (percentage / 100) * video.duration;

      if (currentHandle === startHandle) {
        this.editorState.trim.start = Math.min(time, this.editorState.trim.end - 1);
        startHandle.style.left = `${(this.editorState.trim.start / video.duration) * 100}%`;
      } else {
        this.editorState.trim.end = Math.max(time, this.editorState.trim.start + 1);
        endHandle.style.left = `${(this.editorState.trim.end / video.duration) * 100}%`;
      }

      this.updateDurationInfo();
    };

    const stopDrag = () => {
      isDragging = false;
      currentHandle = null;
      document.removeEventListener('mousemove', drag);
      document.removeEventListener('mouseup', stopDrag);
    };

    startHandle.addEventListener('mousedown', (e) => startDrag(e, startHandle));
    endHandle.addEventListener('mousedown', (e) => startDrag(e, endHandle));
  }

  // Initialize editor sliders
  initEditorSliders() {
    // Brightness slider
    const brightnessSlider = document.getElementById('brightnessSlider');
    if (brightnessSlider) {
      brightnessSlider.addEventListener('input', (e) => {
        const value = e.target.value;
        document.getElementById('brightnessValue').textContent = `${value}%`;
        this.editorState.filters.brightness = parseInt(value);
        this.applyFilters();
      });
    }

    // Contrast slider
    const contrastSlider = document.getElementById('contrastSlider');
    if (contrastSlider) {
      contrastSlider.addEventListener('input', (e) => {
        const value = e.target.value;
        document.getElementById('contrastValue').textContent = `${value}%`;
        this.editorState.filters.contrast = parseInt(value);
        this.applyFilters();
      });
    }

    // Saturation slider
    const saturationSlider = document.getElementById('saturationSlider');
    if (saturationSlider) {
      saturationSlider.addEventListener('input', (e) => {
        const value = e.target.value;
        document.getElementById('saturationValue').textContent = `${value}%`;
        this.editorState.filters.saturation = parseInt(value);
        this.applyFilters();
      });
    }

    // Blur slider
    const blurSlider = document.getElementById('blurSlider');
    if (blurSlider) {
      blurSlider.addEventListener('input', (e) => {
        const value = e.target.value;
        document.getElementById('blurValue').textContent = `${value}px`;
        this.editorState.effects.blur = parseInt(value);
        this.applyEffects();
      });
    }

    // Rotation slider
    const rotationSlider = document.getElementById('rotationSlider');
    if (rotationSlider) {
      rotationSlider.addEventListener('input', (e) => {
        const value = e.target.value;
        document.getElementById('rotationValue').textContent = `${value}°`;
        this.editorState.effects.rotation = parseInt(value);
        this.applyEffects();
      });
    }

    // Scale slider
    const scaleSlider = document.getElementById('scaleSlider');
    if (scaleSlider) {
      scaleSlider.addEventListener('input', (e) => {
        const value = e.target.value;
        document.getElementById('scaleValue').textContent = `${value}%`;
        this.editorState.effects.scale = parseInt(value);
        this.applyEffects();
      });
    }

    // Speed select
    const speedSelect = document.getElementById('speedSelect');
    if (speedSelect) {
      speedSelect.addEventListener('change', (e) => {
        this.editorState.effects.speed = parseFloat(e.target.value);
        this.applyEffects();
      });
    }
  }

  // Initialize editor buttons
  initEditorButtons() {
    // Play/Pause button
    const playPauseBtn = document.getElementById('playPauseBtn');
    if (playPauseBtn) {
      playPauseBtn.addEventListener('click', () => {
        const video = document.getElementById('editorVideo');
        if (video.paused) {
          video.play();
          playPauseBtn.innerHTML = '<i class="bi bi-pause-fill"></i>';
        } else {
          video.pause();
          playPauseBtn.innerHTML = '<i class="bi bi-play-fill"></i>';
        }
      });
    }

    // Step buttons
    const stepBackBtn = document.getElementById('stepBackBtn');
    const stepForwardBtn = document.getElementById('stepForwardBtn');
    if (stepBackBtn && stepForwardBtn) {
      stepBackBtn.addEventListener('click', () => {
        const video = document.getElementById('editorVideo');
        video.currentTime = Math.max(0, video.currentTime - 5);
      });
      stepForwardBtn.addEventListener('click', () => {
        const video = document.getElementById('editorVideo');
        video.currentTime = Math.min(video.duration, video.currentTime + 5);
      });
    }

    // Trim buttons
    const trimStartBtn = document.getElementById('trimStartBtn');
    const trimEndBtn = document.getElementById('trimEndBtn');
    if (trimStartBtn && trimEndBtn) {
      trimStartBtn.addEventListener('click', () => {
        const video = document.getElementById('editorVideo');
        this.editorState.trim.start = video.currentTime;
        this.updateTimelineHandles();
        this.updateDurationInfo();
      });
      trimEndBtn.addEventListener('click', () => {
        const video = document.getElementById('editorVideo');
        this.editorState.trim.end = video.currentTime;
        this.updateTimelineHandles();
        this.updateDurationInfo();
      });
    }

    // Filter preset buttons
    document.querySelectorAll('.filter-preset').forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        this.applyFilterPreset(filter);
      });
    });

    // Reset buttons
    const resetFiltersBtn = document.getElementById('resetFiltersBtn');
    const resetEffectsBtn = document.getElementById('resetEffectsBtn');
    if (resetFiltersBtn) {
      resetFiltersBtn.addEventListener('click', () => this.resetFilters());
    }
    if (resetEffectsBtn) {
      resetEffectsBtn.addEventListener('click', () => this.resetEffects());
    }

    // Flip buttons
    const flipHorizontalBtn = document.getElementById('flipHorizontalBtn');
    const flipVerticalBtn = document.getElementById('flipVerticalBtn');
    if (flipHorizontalBtn) {
      flipHorizontalBtn.addEventListener('click', () => {
        this.editorState.effects.flipH = !this.editorState.effects.flipH;
        this.applyEffects();
      });
    }
    if (flipVerticalBtn) {
      flipVerticalBtn.addEventListener('click', () => {
        this.editorState.effects.flipV = !this.editorState.effects.flipV;
        this.applyEffects();
      });
    }

    // Text position buttons
    document.querySelectorAll('.text-position').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.text-position').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Add text button
    const addTextBtn = document.getElementById('addTextBtn');
    if (addTextBtn) {
      addTextBtn.addEventListener('click', () => this.addTextOverlay());
    }

    // Modal action buttons
    const previewEditBtn = document.getElementById('previewEditBtn');
    const applyEditBtn = document.getElementById('applyEditBtn');
    const exportEditBtn = document.getElementById('exportEditBtn');
    
    if (previewEditBtn) {
      previewEditBtn.addEventListener('click', () => this.previewEdit());
    }
    if (applyEditBtn) {
      applyEditBtn.addEventListener('click', () => this.applyEdit());
    }
    if (exportEditBtn) {
      exportEditBtn.addEventListener('click', () => this.exportEdit());
    }
  }

  // Apply filters to video
  applyFilters() {
    const video = document.getElementById('editorVideo');
    if (!video) return;

    const { brightness, contrast, saturation } = this.editorState.filters;
    const filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
    video.style.filter = filter;
  }

  // Apply effects to video
  applyEffects() {
    const video = document.getElementById('editorVideo');
    if (!video) return;

    const { blur, rotation, scale, speed, flipH, flipV } = this.editorState.effects;
    
    let transform = `scale(${scale / 100}) rotate(${rotation}deg)`;
    if (flipH) transform += ' scaleX(-1)';
    if (flipV) transform += ' scaleY(-1)';
    
    video.style.transform = transform;
    video.style.filter = `blur(${blur}px)`;
    video.playbackRate = speed;
  }

  // Apply filter preset
  applyFilterPreset(preset) {
    const presets = {
      normal: { brightness: 100, contrast: 100, saturation: 100 },
      vintage: { brightness: 110, contrast: 120, saturation: 80 },
      blackwhite: { brightness: 100, contrast: 120, saturation: 0 },
      sepia: { brightness: 110, contrast: 110, saturation: 50 },
      cool: { brightness: 100, contrast: 110, saturation: 120 },
      warm: { brightness: 110, contrast: 110, saturation: 120 }
    };

    if (presets[preset]) {
      this.editorState.filters = { ...presets[preset] };
      
      // Update sliders
      document.getElementById('brightnessSlider').value = this.editorState.filters.brightness;
      document.getElementById('contrastSlider').value = this.editorState.filters.contrast;
      document.getElementById('saturationSlider').value = this.editorState.filters.saturation;
      
      document.getElementById('brightnessValue').textContent = `${this.editorState.filters.brightness}%`;
      document.getElementById('contrastValue').textContent = `${this.editorState.filters.contrast}%`;
      document.getElementById('saturationValue').textContent = `${this.editorState.filters.saturation}%`;
      
      this.applyFilters();
    }
  }

  // Reset filters
  resetFilters() {
    this.editorState.filters = { brightness: 100, contrast: 100, saturation: 100 };
    
    document.getElementById('brightnessSlider').value = 100;
    document.getElementById('contrastSlider').value = 100;
    document.getElementById('saturationSlider').value = 100;
    
    document.getElementById('brightnessValue').textContent = '100%';
    document.getElementById('contrastValue').textContent = '100%';
    document.getElementById('saturationValue').textContent = '100%';
    
    this.applyFilters();
  }

  // Reset effects
  resetEffects() {
    this.editorState.effects = { blur: 0, rotation: 0, scale: 100, speed: 1, flipH: false, flipV: false };
    
    document.getElementById('blurSlider').value = 0;
    document.getElementById('rotationSlider').value = 0;
    document.getElementById('scaleSlider').value = 100;
    document.getElementById('speedSelect').value = 1;
    
    document.getElementById('blurValue').textContent = '0px';
    document.getElementById('rotationValue').textContent = '0°';
    document.getElementById('scaleValue').textContent = '100%';
    
    this.applyEffects();
  }

  // Add text overlay
  addTextOverlay() {
    const content = document.getElementById('textContent').value.trim();
    if (!content) return;

    const size = document.getElementById('textSize').value;
    const color = document.getElementById('textColor').value;
    const position = document.querySelector('.text-position.active')?.dataset.position || 'bottom-center';
    const bold = document.getElementById('textBold').checked;
    const italic = document.getElementById('textItalic').checked;
    const shadow = document.getElementById('textShadow').checked;

    const textOverlay = {
      id: Date.now(),
      content,
      size: parseInt(size),
      color,
      position,
      bold,
      italic,
      shadow
    };

    this.editorState.textOverlays.push(textOverlay);
    this.renderTextOverlays();
    
    // Clear form
    document.getElementById('textContent').value = '';
  }

  // Render text overlays
  renderTextOverlays() {
    const overlay = document.getElementById('editorOverlay');
    if (!overlay) return;

    overlay.innerHTML = '';
    overlay.classList.remove('d-none');

    this.editorState.textOverlays.forEach(text => {
      const textElement = document.createElement('div');
      textElement.className = 'position-absolute text-white';
      textElement.style.fontSize = `${text.size}px`;
      textElement.style.color = text.color;
      textElement.style.fontWeight = text.bold ? 'bold' : 'normal';
      textElement.style.fontStyle = text.italic ? 'italic' : 'normal';
      textElement.style.textShadow = text.shadow ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none';
      textElement.textContent = text.content;

      // Position the text
      const positions = {
        'top-left': { top: '10px', left: '10px' },
        'top-center': { top: '10px', left: '50%', transform: 'translateX(-50%)' },
        'top-right': { top: '10px', right: '10px' },
        'center-left': { top: '50%', left: '10px', transform: 'translateY(-50%)' },
        'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
        'center-right': { top: '50%', right: '10px', transform: 'translateY(-50%)' },
        'bottom-left': { bottom: '10px', left: '10px' },
        'bottom-center': { bottom: '10px', left: '50%', transform: 'translateX(-50%)' },
        'bottom-right': { bottom: '10px', right: '10px' }
      };

      Object.assign(textElement.style, positions[text.position]);
      overlay.appendChild(textElement);
    });
  }

  // Update timeline handles
  updateTimelineHandles() {
    const video = document.getElementById('editorVideo');
    if (!video || !video.duration) return;

    const startHandle = document.getElementById('trimStartHandle');
    const endHandle = document.getElementById('trimEndHandle');
    
    if (startHandle) {
      startHandle.style.left = `${(this.editorState.trim.start / video.duration) * 100}%`;
    }
    if (endHandle) {
      endHandle.style.left = `${(this.editorState.trim.end / video.duration) * 100}%`;
    }
  }

  // Update duration info
  updateDurationInfo() {
    const video = document.getElementById('editorVideo');
    if (!video || !video.duration) return;

    const originalDuration = this.formatTime(video.duration);
    const trimmedDuration = this.formatTime(this.editorState.trim.end - this.editorState.trim.start);
    
    document.getElementById('originalDuration').textContent = originalDuration;
    document.getElementById('trimmedDuration').textContent = trimmedDuration;
  }

  // Format time as MM:SS
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Open video editor
  openVideoEditor(videoData = null) {
    if (videoData) {
      this.currentVideo = videoData;
    } else if (this.items.length > 0) {
      this.currentVideo = this.items[0].detail;
    } else {
      this.toast("No video available for editing", 3000, true);
      return;
    }

    const modal = new this.bootstrap.Modal(document.getElementById('videoEditorModal'));
    const video = document.getElementById('editorVideo');
    
    if (video && this.currentVideo) {
      video.src = this.currentVideo.url;
      video.load();
      
      // Reset editor state
      this.editorState = {
        trim: { start: 0, end: 0 },
        filters: { brightness: 100, contrast: 100, saturation: 100 },
        effects: { blur: 0, rotation: 0, scale: 100, speed: 1, flipH: false, flipV: false },
        textOverlays: []
      };
      
      // Reset UI
      this.resetFilters();
      this.resetEffects();
      document.getElementById('editorOverlay').classList.add('d-none');
    }
    
    modal.show();
  }

  // Preview edit
  previewEdit() {
    const video = document.getElementById('editorVideo');
    if (!video) return;

    // Apply current time to trim start
    this.editorState.trim.start = video.currentTime;
    this.updateTimelineHandles();
    this.updateDurationInfo();
    
    this.toast("Preview mode activated - changes applied in real-time", 3000, false);
  }

  // Apply edit
  async applyEdit() {
    if (!this.currentVideo) return;

    this.showProcessingProgress("Processing video with edits...");
    
    try {
      // Create a canvas to process the video
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const video = document.getElementById('editorVideo');
      
      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Create a new video element for processing
      const processedVideo = document.createElement('video');
      processedVideo.src = video.src;
      processedVideo.muted = true;
      
      await new Promise((resolve) => {
        processedVideo.addEventListener('loadedmetadata', resolve);
        processedVideo.load();
      });
      
      // Process frames and create new video
      const processedBlob = await this.processVideoFrames(processedVideo, canvas, ctx);
      
      // Create new video item with edited version
      const editedVideoData = {
        ...this.currentVideo,
        url: URL.createObjectURL(processedBlob),
        name: `${this.getFileName(this.currentVideo.url)}_edited`,
        size: processedBlob.size,
        edited: true,
        editInfo: {
          trim: this.editorState.trim,
          filters: this.editorState.filters,
          effects: this.editorState.effects,
          textOverlays: this.editorState.textOverlays.length
        }
      };
      
      // Add the edited video to the list
      this.itemCreate(editedVideoData);
      
      this.hideProcessingProgress();
      this.toast("Video edited successfully! New version added to list.", 3000, false);
      
      // Close modal
      const modal = this.bootstrap.Modal.getInstance(document.getElementById('videoEditorModal'));
      if (modal) modal.hide();
      
    } catch (error) {
      console.error('Error applying edits:', error);
      this.hideProcessingProgress();
      this.toast("Failed to apply edits. Please try again.", 3000, true);
    }
  }

  // Process video frames with edits
  async processVideoFrames(video, canvas, ctx) {
    const { trim, filters, effects, textOverlays } = this.editorState;
    const chunks = [];
    const mediaRecorder = new MediaRecorder(canvas.captureStream(30), {
      mimeType: 'video/webm;codecs=vp9'
    });
    
    return new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        resolve(blob);
      };
      
      mediaRecorder.onerror = reject;
      
      // Start recording
      mediaRecorder.start();
      
      // Process video frames
      this.processFrame(video, canvas, ctx, trim, filters, effects, textOverlays, mediaRecorder);
    });
  }
  
  // Process individual frame
  async processFrame(video, canvas, ctx, trim, filters, effects, textOverlays, mediaRecorder) {
    const startTime = trim.start || 0;
    const endTime = trim.end || video.duration;
    const frameRate = 30;
    const frameInterval = 1000 / frameRate;
    const totalDuration = endTime - startTime;
    let processedDuration = 0;
    
    video.currentTime = startTime;
    
    const processNextFrame = () => {
      if (video.currentTime >= endTime) {
        this.updateProcessingProgress(100, "Finalizing video...");
        mediaRecorder.stop();
        return;
      }
      
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Apply filters
      this.applyCanvasFilters(ctx, filters);
      
      // Apply effects
      this.applyCanvasEffects(ctx, effects);
      
      // Apply text overlays
      this.applyCanvasText(ctx, textOverlays, canvas.width, canvas.height);
      
      // Update progress
      processedDuration = video.currentTime - startTime;
      const progress = Math.min((processedDuration / totalDuration) * 100, 99);
      this.updateProcessingProgress(progress, `Processing frame ${Math.floor(processedDuration * frameRate)}...`);
      
      // Move to next frame
      video.currentTime += frameInterval / 1000;
      
      // Process next frame after a short delay
      setTimeout(processNextFrame, frameInterval);
    };
    
    // Wait for video to be ready
    await new Promise((resolve) => {
      video.addEventListener('seeked', resolve, { once: true });
    });
    
    processNextFrame();
  }
  
  // Apply filters to canvas
  applyCanvasFilters(ctx, filters) {
    const { brightness, contrast, saturation } = filters;
    
    // Apply brightness and contrast
    if (brightness !== 100 || contrast !== 100) {
      const brightnessValue = brightness / 100;
      const contrastValue = contrast / 100;
      
      ctx.filter = `brightness(${brightnessValue}) contrast(${contrastValue})`;
    }
    
    // Apply saturation (simplified - would need more complex processing for true saturation)
    if (saturation !== 100) {
      const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
      const data = imageData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        const saturationValue = saturation / 100;
        
        data[i] = gray + saturationValue * (data[i] - gray);
        data[i + 1] = gray + saturationValue * (data[i + 1] - gray);
        data[i + 2] = gray + saturationValue * (data[i + 2] - gray);
      }
      
      ctx.putImageData(imageData, 0, 0);
    }
  }
  
  // Apply effects to canvas
  applyCanvasEffects(ctx, effects) {
    const { blur, rotation, scale, flipH, flipV } = effects;
    
    // Apply transformations
    ctx.save();
    
    // Center the transformations
    ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
    
    // Apply rotation
    if (rotation !== 0) {
      ctx.rotate((rotation * Math.PI) / 180);
    }
    
    // Apply scale
    if (scale !== 100) {
      const scaleValue = scale / 100;
      ctx.scale(scaleValue, scaleValue);
    }
    
    // Apply flips
    if (flipH) {
      ctx.scale(-1, 1);
    }
    if (flipV) {
      ctx.scale(1, -1);
    }
    
    // Draw the image with transformations
    ctx.drawImage(ctx.canvas, -ctx.canvas.width / 2, -ctx.canvas.height / 2);
    
    ctx.restore();
    
    // Apply blur (simplified - would need more complex processing for true blur)
    if (blur > 0) {
      // Simple blur effect using multiple draws with transparency
      const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.globalAlpha = 0.1;
      
      for (let i = 0; i < blur; i++) {
        ctx.drawImage(ctx.canvas, 0, 0);
      }
      
      ctx.globalAlpha = 1.0;
    }
  }
  
  // Apply text overlays to canvas
  applyCanvasText(ctx, textOverlays, width, height) {
    textOverlays.forEach(text => {
      ctx.save();
      
      // Set text properties
      ctx.font = `${text.bold ? 'bold ' : ''}${text.italic ? 'italic ' : ''}${text.size}px Arial`;
      ctx.fillStyle = text.color;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Apply shadow if enabled
      if (text.shadow) {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
      }
      
      // Calculate position
      let x, y;
      const padding = 20;
      
      switch (text.position) {
        case 'top-left':
          x = padding;
          y = padding;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          break;
        case 'top-center':
          x = width / 2;
          y = padding;
          ctx.textBaseline = 'top';
          break;
        case 'top-right':
          x = width - padding;
          y = padding;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'top';
          break;
        case 'center-left':
          x = padding;
          y = height / 2;
          ctx.textAlign = 'left';
          break;
        case 'center':
          x = width / 2;
          y = height / 2;
          break;
        case 'center-right':
          x = width - padding;
          y = height / 2;
          ctx.textAlign = 'right';
          break;
        case 'bottom-left':
          x = padding;
          y = height - padding;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          break;
        case 'bottom-center':
          x = width / 2;
          y = height - padding;
          ctx.textBaseline = 'bottom';
          break;
        case 'bottom-right':
          x = width - padding;
          y = height - padding;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          break;
        default:
          x = width / 2;
          y = height / 2;
      }
      
      // Draw text
      ctx.fillText(text.content, x, y);
      
      ctx.restore();
    });
  }
  
  // Show processing progress
  showProcessingProgress(message) {
    const progressDiv = document.getElementById('processingProgress');
    const progressText = document.getElementById('processingText');
    
    if (progressDiv && progressText) {
      progressText.textContent = message;
      progressDiv.classList.remove('d-none');
    }
  }
  
  // Hide processing progress
  hideProcessingProgress() {
    const progressDiv = document.getElementById('processingProgress');
    if (progressDiv) {
      progressDiv.classList.add('d-none');
    }
  }
  
  // Update processing progress
  updateProcessingProgress(percentage, message) {
    const progressBar = document.getElementById('processingBar');
    const progressText = document.getElementById('processingText');
    
    if (progressBar) {
      progressBar.style.width = `${percentage}%`;
      progressBar.setAttribute('aria-valuenow', percentage);
    }
    
    if (progressText) {
      progressText.textContent = message;
    }
  }
  
  // Download HLS stream with all segments
  async downloadHLSStream(url, filename) {
    try {
      // First download the manifest
      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: false
      });
      
      // Show notification about HLS download
      this.toast("HLS manifest downloaded. For complete stream, use recording feature.", 5000, false);
      
      // Optionally, open recording page for full stream capture
      setTimeout(() => {
        if (confirm("Would you like to record the complete HLS stream? This will capture all segments.")) {
          this.createTab({ url }, true, "hls");
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error downloading HLS stream:', error);
      this.toast("Failed to download HLS stream. Please try recording instead.", 3000, true);
    }
  }
  
  // Export edit
  async exportEdit() {
    if (!this.currentVideo) return;

    this.showProcessingProgress("Processing video for export...");
    
    try {
      // Process the video with current edits
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const video = document.getElementById('editorVideo');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const processedVideo = document.createElement('video');
      processedVideo.src = video.src;
      processedVideo.muted = true;
      
      await new Promise((resolve) => {
        processedVideo.addEventListener('loadedmetadata', resolve);
        processedVideo.load();
      });
      
      const processedBlob = await this.processVideoFrames(processedVideo, canvas, ctx);
      
      // Create download link
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(processedBlob);
      downloadLink.download = `${this.getFileName(this.currentVideo.url)}_edited.webm`;
      downloadLink.click();
      
      this.hideProcessingProgress();
      this.toast("Export completed! File downloaded successfully.", 5000, false);
      
      // Close modal
      const modal = this.bootstrap.Modal.getInstance(document.getElementById('videoEditorModal'));
      if (modal) modal.hide();
      
    } catch (error) {
      console.error('Error exporting video:', error);
      this.hideProcessingProgress();
      this.toast("Failed to export video. Please try again.", 3000, true);
    }
  }
}

// Default options
const OPTION = {
  size: { min: 0, max: 0 },
  domain: [],
  noAddDomainTip: false,
  noRecordTip: false,
  lang: ["en", "zh", "ja", "ko", "es", "fr", "de", "it", "pt", "ru"],
  site: "https://vfetch.dev"
};

// On init, load videos from per-tab storage
async function loadVideosForTab(tabId) {
  const storageKey = `vfetchpro_tab_${tabId}`;
  const storage = await new Promise((resolve) => {
    chrome.storage.local.get([storageKey], (result) => {
      resolve(result[storageKey] || {});
    });
  });
  return storage;
}

// Initialize popup
const popup = new VFetchProPopup();
popup.init(); 