'use client';

import { App } from 'antd';
import { hasWork } from '@/components/project/startOver';
import { useEditorStore } from '@/lib/editor/store';
import type { PageTemplate } from '@/lib/templates';

/** The address that opens the editor on a template, e.g. `https://…/?template=landing`. */
export function templateLink(template: PageTemplate, origin = window.location.origin): string {
  return `${origin}/?template=${encodeURIComponent(template.id)}`;
}

/** What can be done with a template from the UI, with the app's confirmations and messages. */
export function useTemplateActions() {
  const { message, modal } = App.useApp();

  const start = (template: PageTemplate, onStarted?: () => void) => {
    const run = () => {
      useEditorStore.getState().loadTemplate(template.id);
      onStarted?.();
      message.success(`Started from the ${template.label} template`);
    };
    const state = useEditorStore.getState();
    if (!hasWork(state)) {
      run();
      return;
    }
    modal.confirm({
      title: `Start from the ${template.label} template?`,
      content: `"${state.name}" will be replaced, and its versions and undo history will be gone. Save it first to keep a copy, or add the template to the page instead. Your saved blocks stay.`,
      okText: 'Use template',
      okButtonProps: { danger: true },
      onOk: run,
    });
  };

  /** Appends the template to the current page: undoable, so no confirmation. */
  const add = (template: PageTemplate) => {
    useEditorStore.getState().insertTemplate(template.id);
    message.success(`Added the ${template.label} template to the page`);
  };

  const copyLink = async (template: PageTemplate) => {
    try {
      await navigator.clipboard.writeText(templateLink(template));
      message.success('Link copied');
    } catch {
      message.error('Copying is not allowed here');
    }
  };

  return { start, add, copyLink };
}
