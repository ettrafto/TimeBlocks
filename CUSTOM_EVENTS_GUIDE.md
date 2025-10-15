# ➕ Custom Event Templates - User Guide

## ✅ Implementation Complete!

Your time-blocking calendar now features **custom event creation**:
1. **➕ Create Events** - Design your own event templates with custom names, durations, and colors
2. **✏️ Edit Events** - Update existing templates anytime
3. **🎨 Color Picker** - Choose from 10 beautiful Tailwind colors
4. **⏱️ Duration Options** - Select from 15 to 120 minutes in 15-minute increments

---

## 🎯 How It Works

### **Left Panel - Event Templates**

The left panel now features:
- **Header** with "Event Templates" title
- **➕ Plus Button** in the top-right corner
- **Template List** showing all your custom events
- **Empty State** when no templates exist yet
- **Instructions** for using the calendar

### **Creating a New Event:**

1. Click the **➕** button in the top-right corner
2. Modal appears: "Create New Event"
3. Fill in the form:
   - **Name** (required) - e.g., "Team Meeting", "Lunch Break"
   - **Duration** (required) - Select from dropdown: 15, 30, 45, 60, 75, 90, 105, or 120 minutes
   - **Color** (required) - Click a color square to select
   - **Type** (optional) - e.g., "Work", "Personal", "Exercise"
4. Click **Create Event**
5. Template appears in the left panel!

### **Editing an Existing Event:**

1. **Click any event template** in the left panel
2. Modal appears: "Edit Event" (pre-filled with current values)
3. Update any fields
4. Click **Save Changes**
5. Template updates in-place!

---

## 🎨 Visual Design

### **Plus Button:**
```
┌────────────────────────────────┐
│ Event Templates           ⊕   │ ← Blue circular button
└────────────────────────────────┘
```

### **Empty State:**
```
╔════════════════════════════════╗
║ No event templates yet!        ║
║                                ║
║ Click the + button above to    ║
║ create your first event template║
╚════════════════════════════════╝
```

### **Event Template Card:**
```
┌────────────────────────────────┐
│ Team Meeting            ✏️     │ ← Edit icon on hover
│ 30 minutes                     │
└────────────────────────────────┘
```

---

## 📝 Event Editor Modal

### **Form Fields:**

#### **1. Event Name (Required)**
- Text input
- Placeholder: "e.g., Team Meeting"
- Used as the label for the event block

#### **2. Duration (Required)**
- Dropdown select
- Options: 15, 30, 45, 60, 75, 90, 105, 120 minutes
- Default: 30 minutes

#### **3. Color (Required)**
- Visual color picker (grid of 10 colors)
- Available colors:
  - Blue (`bg-blue-500`)
  - Purple (`bg-purple-500`)
  - Green (`bg-green-500`)
  - Orange (`bg-orange-500`)
  - Red (`bg-red-500`)
  - Yellow (`bg-yellow-500`)
  - Pink (`bg-pink-500`)
  - Indigo (`bg-indigo-500`)
  - Teal (`bg-teal-500`)
  - Cyan (`bg-cyan-500`)

#### **4. Type (Optional)**
- Text input
- Placeholder: "e.g., Work, Personal, Exercise"
- Stored for future use (not currently displayed)

### **Buttons:**
- **Cancel** (gray) - Closes modal without saving
- **Create Event** (blue) - Saves new template
- **Save Changes** (blue) - Updates existing template

---

## 🔧 Technical Implementation

### **Data Structure:**

Each custom event template is stored as:

```javascript
{
  id: "template-1634567890123",  // Unique ID (timestamp-based)
  name: "Team Meeting",           // Event label
  duration: 30,                   // Minutes
  color: "bg-blue-500",           // Tailwind class
  type: "Work"                    // Optional category
}
```

### **State Management:**

```javascript
// Array of custom templates
const [taskTemplates, setTaskTemplates] = useState([]);

// Modal state
const [showEventEditor, setShowEventEditor] = useState(false);
const [editingTemplate, setEditingTemplate] = useState(null);
```

### **Key Functions:**

#### **Create Template:**
```javascript
const handleCreateTemplate = () => {
  setEditingTemplate(null);  // Clear editing state
  setShowEventEditor(true);  // Open modal
};
```

#### **Edit Template:**
```javascript
const handleEditTemplate = (template) => {
  setEditingTemplate(template);  // Set template to edit
  setShowEventEditor(true);      // Open modal
};
```

#### **Save Template:**
```javascript
const handleSaveTemplate = (templateData) => {
  if (editingTemplate) {
    // Update existing
    setTaskTemplates(prev => 
      prev.map(t => t.id === templateData.id ? templateData : t)
    );
  } else {
    // Create new
    setTaskTemplates(prev => [...prev, templateData]);
  }
};
```

---

## 🧪 Testing Scenarios

### **Test 1: Create First Event**
```
1. Open app - see empty state
2. Click + button
3. Fill form:
   - Name: "Team Meeting"
   - Duration: 30 minutes
   - Color: Purple
   - Type: "Work"
4. Click "Create Event"
5. Expected: Purple "Team Meeting" block appears in left panel
```

### **Test 2: Drag Custom Event**
```
1. Create "Lunch" event (45 min, green)
2. Drag to calendar at 12:00 PM
3. Expected: Green 45-minute block appears (3 slots tall)
```

### **Test 3: Edit Existing Event**
```
1. Create "Exercise" event (60 min, blue)
2. Click the "Exercise" block
3. Modal opens with values pre-filled
4. Change duration to 90 minutes
5. Change color to red
6. Click "Save Changes"
7. Expected: Block updates to red, still draggable
```

### **Test 4: Multiple Custom Events**
```
1. Create 5 different events with different colors/durations
2. Expected: All appear in left panel
3. Drag each to calendar
4. Expected: Each maintains its custom color and height
```

### **Test 5: Edit Icon Visibility**
```
1. Create an event
2. Hover over the event block
3. Expected: Small ✏️ icon appears in top-right
4. Move mouse away
5. Expected: Icon fades out
```

---

## 📊 Console Logging

### **Creating Template:**
```javascript
➕ Created template: Team Meeting
```

### **Editing Template:**
```javascript
✏️ Updated template: Team Meeting
```

### **Dragging Custom Event:**
```javascript
🚀 DRAG START: {id: 'template-1634567890123', type: 'template', label: 'Team Meeting'}
👻 Ghost preview: {time: '2:00 PM', duration: '30 min', ...}
✅ Placed "Team Meeting" at 2:00 PM (30 min duration)
```

---

## 🎨 User Experience Flow

```
User Journey - Creating & Using Custom Events:

1. User opens calendar
   ↓
2. Sees "No event templates yet!"
   ↓
3. Clicks + button
   ↓
4. Modal opens with form
   ↓
5. Fills in event details
   ↓
6. Clicks "Create Event"
   ↓
7. Modal closes, template appears in left panel
   ↓
8. User drags template to calendar
   ↓
9. Event placed with custom color and duration
   ↓
10. User clicks template to edit
   ↓
11. Updates duration or color
   ↓
12. Saves changes
   ↓
13. Template updates in left panel
```

---

## 🎯 Features Highlights

### **✅ Fully Custom:**
- Users define all event properties
- No predefined templates anymore
- Complete control over scheduling blocks

### **✅ Reusable:**
- Create once, use multiple times
- Drag same template to different time slots
- Templates never disappear from left panel

### **✅ Editable:**
- Click to edit anytime
- Update name, duration, color, or type
- Changes apply to template only (not scheduled instances)

### **✅ Visual Feedback:**
- Edit icon on hover
- Selected color highlighted with ring
- Duration shown in minutes
- Color-coded blocks

### **✅ User-Friendly:**
- Clear empty state
- Helpful instructions
- Intuitive modal forms
- Validation (name required)

---

## 💡 Pro Tips

### **Tip 1: Color Coding**
```
Use colors to organize event types:
- Blue: Work meetings
- Green: Personal time
- Red: Urgent tasks
- Purple: Creative work
- Orange: Exercise/health
```

### **Tip 2: Common Durations**
```
Create templates for your common blocks:
- 15 min: Quick check-ins
- 30 min: Standard meetings
- 45 min: Lunch breaks
- 60 min: Deep work sessions
- 90 min: Workshops
```

### **Tip 3: Naming Conventions**
```
Be specific with names:
✅ "Team Standup" (not just "Meeting")
✅ "Lunch Break" (not just "Lunch")
✅ "Gym Workout" (not just "Exercise")
```

### **Tip 4: Type Field**
```
Use the Type field for future filtering:
- "Work", "Personal", "Health", "Learning"
- Can be used later for color-coding or filtering
```

---

## 🚨 Edge Cases Handled

### **1. Empty Name Validation:**
```
Try to create event without name
→ Alert: "Please enter an event name"
→ Modal stays open
```

### **2. Click vs Drag:**
```
Click event block quickly
→ Opens edit modal

Drag event block
→ Starts drag operation (no modal)
```

### **3. Modal Cancel:**
```
Click Cancel or outside modal
→ Changes discarded
→ Template list unchanged
```

### **4. Form Reset:**
```
Open create modal
→ Form is empty

Edit template A
→ Cancel
→ Edit template B
→ Form shows B's values (not A's)
```

---

## 🔄 Workflow Examples

### **Example 1: Daily Routine Setup**
```
1. Create templates:
   - "Morning Standup" (15 min, blue)
   - "Deep Work" (90 min, purple)
   - "Lunch" (45 min, green)
   - "Email Time" (30 min, cyan)
   
2. Drag to calendar:
   - 9:00 AM: Morning Standup
   - 9:30 AM: Deep Work
   - 12:00 PM: Lunch
   - 1:00 PM: Email Time
   
3. Result: Full day planned with color-coded blocks
```

### **Example 2: Meeting Types**
```
1. Create meeting templates:
   - "1-on-1" (30 min, blue)
   - "Team Meeting" (60 min, purple)
   - "Client Call" (45 min, orange)
   
2. Reuse throughout week
3. Quickly schedule recurring meetings
```

---

## ✅ Success Checklist

After implementation:

- [x] Plus button in top-right of left panel
- [x] Plus button opens create modal
- [x] Modal has all 4 fields (name, duration, color, type)
- [x] Color picker shows 10 colors
- [x] Duration dropdown has 8 options
- [x] Create button saves new template
- [x] Template appears in left panel
- [x] Template is draggable
- [x] Click template opens edit modal
- [x] Edit modal pre-fills values
- [x] Save Changes updates template
- [x] Cancel closes modal without saving
- [x] Empty state shows when no templates
- [x] Edit icon shows on hover
- [x] Console logs create/edit actions

---

## 🎬 Try It Now!

1. **Open** http://localhost:5173
2. **Click** the ➕ button
3. **Create** your first event:
   - Name: "My First Event"
   - Duration: 30 minutes
   - Color: Blue
4. **Click** "Create Event"
5. **See** it appear in the left panel
6. **Drag** it to the calendar
7. **Click** the template to edit it
8. **Change** the color to purple
9. **Save** changes
10. **Drag** again to see the new color!

---

**Your calendar is now fully customizable!** Create unlimited event templates and build your perfect schedule! 🎯

