import sys

with open('src/pages/Subjects.tsx', 'r') as f:
    content = f.read()

# 1. Add modalInitialTab
if 'modalInitialTab' not in content:
    content = content.replace(
        'const [isImportEditalModalOpen, setIsImportEditalModalOpen] = useState(false);',
        'const [isImportEditalModalOpen, setIsImportEditalModalOpen] = useState(false);\n  const [modalInitialTab, setModalInitialTab] = useState<\'ready\'|\'ia\'|\'manual\'>(\'ready\');'
    )

# 2. Modify Empty State Buttons to open Modal
content = content.replace(
    'onClick={() => setContentUploadModal(true)}',
    'onClick={() => { setModalInitialTab(\'ready\'); setIsImportEditalModalOpen(true); }}'
)
content = content.replace(
    'onClick={() => setShowManualInput(true)}',
    'onClick={() => { setModalInitialTab(\'manual\'); setIsImportEditalModalOpen(true); }}'
)

# 3. Modify condition for Header
content = content.replace(
    '{(localSubjects.length > 0 || showManualInput) && (',
    '{(localSubjects.length > 0 || showManualInput || isImportEditalModalOpen) && ('
)

# 4. Extract contentToRender around line 914
trigger1 = '        {/* Header Outside Card */}\n        <main className="flex-1 px-4 md:px-8 pb-8 pt-0">\n          <div className="space-y-6 w-full"> {/* Changed space-y-4 to 6 to match Topics */}'
replace1 = '        {/* Header Outside Card */}\n        <main className="flex-1 px-4 md:px-8 pb-8 pt-0">\n        {(() => {\n            const contentToRender = (\n            <div className="space-y-6 w-full">'

content = content.replace(trigger1, replace1)

# 5. Hide Empty State when Modal is open
trigger_empty = '{localSubjects.length === 0 && !showManualInput ? ('
replace_empty = '{localSubjects.length === 0 && !showManualInput && !isImportEditalModalOpen ? ('
content = content.replace(trigger_empty, replace_empty)

# 6. Close contentToRender and conditionally render it in main
trigger2 = '            </DndContext>\n            {/* Modals positioned within the layout */}'
replace2 = '            </DndContext>\n            </div>\n            );\n            return !isImportEditalModalOpen ? contentToRender : null;\n        })()}\n            {/* Modals positioned within the layout */}'

content = content.replace(trigger2, replace2)

# 7. Pass props to ImportEditalModal
trigger_modal = '<ImportEditalModal\n                isOpen={isImportEditalModalOpen}\n                onClose={() => setIsImportEditalModalOpen(false)}'
replace_modal = '<ImportEditalModal\n                isOpen={isImportEditalModalOpen}\n                onClose={() => setIsImportEditalModalOpen(false)}\n                initialTab={modalInitialTab}\n                manualModeChildren={\n                  <div className="space-y-6 w-full">\n                    {(localSubjects.length > 0 || showManualInput || isImportEditalModalOpen) && (\n                      <div className="glow-card p-4 rounded-2xl flex flex-col items-start gap-4 mb-6 relative z-20">\n                        {/* We use a duplicate structure just for the modal to avoid ref issues or we can let React handle it. Actually, wait! The contentToRender function creates JSX correctly. But if the modal is OPEN, !isImportEditalModalOpen is false so main returns null. We must define contentToRender OUTSIDE the render block so it can be passed to the modal! */}'

# Wait, if I define contentToRender inside an IIFE in main, I can't pass it to the modal further down.
# Let's fix the extraction to define contentToRender before main, but after render starts.
