# TODO: Video Downloader Enhancements

## 1. Thumbnails in Popup
- [x] Modify popup/popup.html: Add img element in the item template for thumbnail display.
- [x] Modify popup/popup.js: Implement thumbnail generation logic using video element or canvas to capture a frame from the video URL.
- [x] Ensure thumbnails update automatically on new video detection (integrate with existing render function).

## 2. Full-Page Video List
- [x] Modify popup/popup.html: Add a button to open the full-page video list.
- [x] Create popup/fullpage.html: New HTML file for the full-page video list UI.
- [x] Create popup/fullpage.js: JavaScript file to handle full-page list rendering and download functionality.
- [x] Modify manifest.json: Add the new fullpage.html as an extension page or configure for new tab opening.
- [x] Modify popup/popup.js: Add event handler for the full-page button to open the new page/tab.

## 3. Full Video Fetching
- [x] Review content.js and background.js: Verified no truncation to 15 seconds; full video fetching is already implemented for HLS/DASH/direct downloads.
- [x] Modify detection/fetching logic if needed to ensure full video duration is fetched instead of previews. (No changes needed)
- [x] Test and confirm full video downloads work correctly.

## General
- [x] Update popup/popup.css if needed for new UI elements (thumbnails, button).
- [x] Test all enhancements: Thumbnails display, full-page list opens and functions, full video fetching.
- [x] Fix issues: Video detection on play, record tab connection, full-page tabId passing, syntax errors.
