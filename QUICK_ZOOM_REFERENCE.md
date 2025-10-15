# 🔍 Quick Zoom & Scroll Reference

## ⌨️ Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Zoom In | **Ctrl + Scroll Up** |
| Zoom Out | **Ctrl + Scroll Down** |
| Scroll Calendar | **Click + Drag** |

---

## 📊 Zoom Levels

```
50%  ──┐              Overview
75%    │              
100% ──┤ (Default)    Balanced
150%   │              
200% ──┤              Detailed
300%   │              
400% ──┘              Maximum
```

---

## 🎯 Quick Tests

### **1. Zoom Test:**
```bash
Ctrl + Scroll Up    → Calendar grows
Ctrl + Scroll Down  → Calendar shrinks
Check header        → Shows zoom %
```

### **2. Scroll-Drag Test:**
```bash
Click empty space   → Cursor changes to grab
Drag vertically     → Calendar pans
Release             → Stops panning
```

### **3. Combined Test:**
```bash
Zoom to 200%       → Events get taller
Place new event    → Ghost scales correctly
Reposition event   → Works at new zoom
```

---

## 🐛 Troubleshooting

**Zoom not working?**
- Make sure you're holding **Ctrl** (or **Cmd** on Mac)
- Scroll over the calendar area
- Check console for zoom logs

**Scroll-drag not working?**
- Click on **empty calendar space** (not on events)
- Try with left mouse button
- Check if cursor changes to grabbing hand

**Events misaligned after zoom?**
- This shouldn't happen! All math is zoom-aware
- Check console logs for calculations
- Report the issue with zoom level

---

## 💡 Tips

✨ **Zoom for precision:**
- Zoom in (200%) for detailed work
- Zoom out (50%) for overview

✨ **Scroll-drag for speed:**
- Faster than scrollbar
- More intuitive than keyboard

✨ **Watch the zoom indicator:**
- Top-right of calendar
- Shows current zoom %

---

## 📝 Console Logs

Watch for these:
```javascript
🔍 Zoom: {from: '20.0px/slot', to: '30.0px/slot', percentage: '150%'}
📜 Scroll drag: {deltaY: '150', scrollTop: '420'}
👻 Ghost preview: {..., zoom: '30.0px/slot'}
```

---

**That's it! Start zooming and panning!** 🚀

