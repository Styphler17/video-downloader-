
const VFetchLink = {
  getHomepageURL() {
    return chrome.runtime.getManifest().homepage_url || "https://vfetch.dev/";
  },

  openHomepage(offset = 1) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentIndex = tabs[0]?.index || 0;
      chrome.tabs.create({
        url: this.getHomepageURL(),
        index: currentIndex + offset
      });
    });
  },

  openFeedback() {
    chrome.tabs.create({ url: this.getHomepageURL() + "#feedback" });
  },

  openDonate() {
    chrome.tabs.create({ url: this.getHomepageURL() + "#donate" });
  },

  openProjects() {
    chrome.tabs.create({ url: this.getHomepageURL() + "#projects" });
  }
};
