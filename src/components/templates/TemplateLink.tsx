'use client';

import { App } from 'antd';
import { useEffect } from 'react';
import { getTemplate } from '@/lib/templates';
import { useTemplateActions } from './templateActions';

export const TEMPLATE_PARAM = 'template';

/**
 * Opens the editor on a template linked as `?template=<id>`: starts from it (asking first when
 * that would replace work) and drops the parameter, so a reload doesn't apply it again.
 */
export function TemplateLink() {
  const { message } = App.useApp();
  const { start } = useTemplateActions();

  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get(TEMPLATE_PARAM);
    if (id === null) return;
    // Wait for the rest of this render's effects, autosave's restore among them, so the
    // template applies over the restored project rather than being overwritten by it. The
    // parameter stays until then: a cancelled run (Strict Mode) must leave it for the next.
    const timer = setTimeout(() => {
      url.searchParams.delete(TEMPLATE_PARAM);
      window.history.replaceState(window.history.state, '', url);
      const template = getTemplate(id);
      if (template) start(template);
      else message.error(`There is no "${id}" template`);
    });
    return () => clearTimeout(timer);
    // Once, on opening the editor.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
