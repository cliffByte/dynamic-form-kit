'use client';

import React from 'react';
import { FormCanvas as GenericFormCanvas } from '../../../FormCanvas';
import { useFormBuilderStore } from '../../store/useFormBuilderStore';
import { useShallow } from 'zustand/react/shallow';

export const FormCanvas = React.memo(function FormCanvas() {
  const {
    fields,
    selectedFieldId,
    selectField,
    updateField,
    deleteField,
    moveField,
    addFieldToSection,
    addFieldFromTemplateToSection,
    moveFieldBetweenSections,
  } = useFormBuilderStore(
    useShallow((state) => ({
      fields: state.fields,
      selectedFieldId: state.selectedFieldId,
      selectField: state.selectField,
      updateField: state.updateField,
      deleteField: state.deleteField,
      moveField: state.moveField,
      addFieldToSection: state.addFieldToSection,
      addFieldFromTemplateToSection: state.addFieldFromTemplateToSection,
      moveFieldBetweenSections: state.moveFieldBetweenSections,
    })),
  );

  return (
    <GenericFormCanvas
      fields={fields}
      selectedFieldId={selectedFieldId}
      onFieldSelect={selectField}
      onFieldUpdate={updateField}
      onFieldDelete={deleteField}
      onFieldMove={moveField}
      onFieldAdd={addFieldToSection}
      onTemplateAdd={addFieldFromTemplateToSection}
      onFieldMoveBetweenSections={moveFieldBetweenSections}
    />
  );
});
