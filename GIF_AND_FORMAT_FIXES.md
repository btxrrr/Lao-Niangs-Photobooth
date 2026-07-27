# GIF Animation & Video Format Fixes - Session 3

## Issues Resolved

### 1. **GIF Static in Video Export** ✅
**Root Cause**: GIFs were loaded with `visibility: hidden` which prevents browser animation. Canvas.drawImage() can only draw the current state of the image element.

**Fix**:
- Removed `visibility: hidden` from hidden GIF node styling
- Changed to use `opacity: 1` instead, keeping GIFs off-screen but visible
- Off-screen positioning (-999999px) ensures GIFs don't appear in UI but are still animated by the browser
- Increased export duration from 8s → **10 seconds** to capture multiple GIF animation loops
- Increased capture frame rate: 60fps = 600 total frames for better temporal resolution

**Technical Details**:
- Hidden GIF nodes are now positioned: `fixed; left: -999999px; top: -999999px`
- No `visibility: hidden` = browser continues animating the GIF
- Canvas.captureStream(60) captures at 60fps
- As drawScene() repeatedly calls ctx.drawImage() on the animating GIF element, canvas captures different animation frames
- 10-second capture × 60fps = 600 frames, likely capturing 6-10 full GIF animation cycles

**Result**: GIFs in story slots and layers should now show animation in exported videos

---

### 2. **Wrong Video Format (WebM instead of MP4)** ✅
**Root Cause**: 
- MediaRecorder defaulted to WebM format
- Download button hardcoded to use `.webm` extension

**Fix - Part A: Format Selection**:
```javascript
// Try formats in order: MP4 > WebM VP9 > WebM
const supportedTypes = [
  "video/mp4;codecs=h264",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm"
]

for (const type of supportedTypes) {
  if (MediaRecorder.isTypeSupported(type)) {
    mimeType = type
    break
  }
}
```
- Attempts MP4 (H264) first on supported browsers
- Falls back to WebM VP9, then standard WebM
- Blob created with actual MIME type: `new Blob(chunks, { type: mimeType })`

**Fix - Part B: Download Extension**:
- Added state variable: `mimeTypeUsed` to track actual format
- Updated download button to use correct extension:
  - `"mp4"` if mimeType includes "mp4"
  - `"webm"` for WebM format
  - `"png"` for static images

**Result**: 
- Video exported as MP4 on systems that support it
- Fallback to WebM on unsupported browsers
- Download filename matches actual file format

---

## Files Modified

### `FrameStudio.jsx`
**Changes**:
1. Line ~75: Removed `visibility: hidden` from GIF container
2. Line ~155: Added `mimeTypeUsed` state variable
3. Lines ~309-310: Reset mimeTypeUsed on export start
4. Lines ~420-440: Implemented smart MIME type selection with fallback chain
5. Lines ~450-452: Store mimeTypeUsed and create blob with actual MIME type
6. Lines ~447: Increased DURATION_MS from 8000 → 10000ms
7. Lines ~913-921: Updated download button to use dynamic file extension

---

## Testing Checklist

- [ ] **GIF Animation**: 
  - Add animated GIF to story slot
  - Export composition
  - Play video - should see GIF animating (not static)
  - Verify video duration is ~10 seconds
  - Check for multiple GIF animation loops

- [ ] **MP4 Export (if supported)**:
  - Export composition with any images
  - Check browser console for supported MIME type
  - Verify downloaded file is `.mp4` format
  - Try playing with media player

- [ ] **WebM Fallback**:
  - On browsers without MP4 support
  - Verify downloaded file is `.webm` format
  - Confirm video plays correctly

- [ ] **Static Image Export**:
  - Export composition without GIFs
  - Verify downloaded file is `.png` format
  - Confirm image displays correctly

---

## Browser Compatibility

### MP4 Support
- Chrome/Edge: ✅ Supported (H264 codec)
- Firefox: ⚠️ Limited (may fall back to WebM)
- Safari: ✅ Supported (H264 codec)
- Mobile browsers: ✅ Usually supported

### WebM Support
- Chrome/Edge/Firefox: ✅ Supported
- Safari: ❌ Not supported (falls back to no animated export)
- Mobile: ⚠️ Variable support

### Fallback Behavior
- If neither MP4 nor WebM supported: Video export will fail gracefully with error message
- Users can still export static images (PNG)

---

## Technical Notes

### GIF Animation Mechanism
1. GIF image element is positioned off-screen but visible (not hidden)
2. Browser's rendering engine animates the GIF in its internal state
3. Canvas.drawImage() captures the current visual frame of the GIF element
4. By repeatedly drawing (~every 16ms at 60fps) while GIF animates, canvas captures different frames
5. Canvas.captureStream(60) records these varying frames into video stream
6. Result: Animated GIF plays in video

### Video Format Selection Strategy
```
User clicks Export
→ Check browser support for MP4
→ If yes: Record as H264 MP4 (better compatibility, smaller file)
→ If no: Check VP9 WebM support
→ If no: Fall back to standard WebM
→ Record video
→ Create blob with matched MIME type
→ Download with correct extension
```

---

## Known Limitations

1. **GIF Animation Frame Accuracy**: 
   - Depends on browser GIF rendering timing and canvas capture sync
   - Most GIFs should animate smoothly, but frame-perfect reproduction not guaranteed

2. **MP4 Size**: 
   - MP4 files may be larger than WebM due to codec differences
   - Not a concern for typical export use case

3. **Browser Support**: 
   - Older browsers may not support MP4 MediaRecorder
   - Users on Firefox might get WebM instead of MP4
   - This is expected and handled gracefully

---

## Files That Could Be Updated (Optional)

If you want even better GIF support, consider:
- `gifDecoder.js` - GIF frame extraction utility (created but not yet integrated)
- Backend video processing with FFmpeg for post-processing
- WebCodecs API support when available (future browsers)

