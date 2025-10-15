# 📏 Resize Feature - Quick Reference

## ⌨️ How to Resize

| Action | Steps |
|--------|-------|
| **Extend Duration** | Hover bottom edge → Drag down ↓ |
| **Shorten Duration** | Hover bottom edge → Drag up ↑ |
| **Start Earlier** | Hover top edge → Drag up ↑ |
| **Start Later** | Hover top edge → Drag down ↓ |

---

## 🎯 Visual Cues

| Indicator | Meaning |
|-----------|---------|
| ↕️ Cursor | Hovering over resize handle |
| ▬▬ White nub | Resize handle location |
| Faded event | Original during resize |
| Solid event | Live preview of new size |
| Time updates | Shows new start/end times |

---

## 📊 Constraints

| Limit | Value |
|-------|-------|
| **Minimum Duration** | 15 minutes (1 slot) |
| **Earliest Start** | 8:00 AM |
| **Latest End** | 5:00 PM |
| **Snap Increment** | 15 minutes |

---

## 🧪 Quick Tests

### **Test 1: Extend Event**
```bash
1. Place event → 30 min
2. Drag bottom edge down 2 slots
3. Result → 60 min ✓
```

### **Test 2: Shift Start Time**
```bash
1. Place event → 10:00-10:30
2. Drag top edge up 1 slot
3. Result → 9:45-10:30 (45 min) ✓
```

### **Test 3: Overlap Warning**
```bash
1. Place 2 events (no overlap)
2. Resize one into the other
3. Modal appears ✓
4. Click Allow or Cancel ✓
```

---

## 📝 Console Logs

```javascript
🔧 Resize START: {event: 'Meeting', edge: 'end', startTime: '10:00 AM'}
🔧 Resize END: {event: 'Meeting', newStart: '10:00 AM', newDuration: '60 min'}
✅ Resize applied: Meeting

// OR if overlap:
⚠️ Resize creates overlap with: Lunch
```

---

## 💡 Tips

✨ **Zoom in (200%)** for easier handle grabbing  
✨ **Watch the time label** for live feedback  
✨ **15-min snapping** ensures clean boundaries  
✨ **Overlap modal** prevents conflicts  

---

## 🎬 Try It!

1. Drag demo event to calendar
2. Hover bottom edge
3. See cursor change to ↕️
4. Drag to resize!

**That's it!** 🚀

