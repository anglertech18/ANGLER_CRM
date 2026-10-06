import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import type { Editor } from 'grapesjs';
import grapesjs from 'grapesjs';
import 'grapesjs/dist/css/grapes.min.css';
// @ts-ignore — no official type declarations for this package
import gjsPresetNewsletter from 'grapesjs-preset-newsletter';

export interface TokenDef {
  key: string;
  label: string;
  category: string;
  sample: string;
}

export interface BuilderHandle {
  getData: () => { editor_json: object; compiled_html: string };
  loadData: (json: object) => void;
}

interface Props {
  initialJson?: object | null;
  initialHtml?: string | null;
  tokens: TokenDef[];
  height?: string;
}

const TOKEN_CANVAS_CSS = `
  .renewal-token {
    display: inline-block;
    background: #e0e7ff;
    color: #4338ca;
    border: 1px solid #c7d2fe;
    border-radius: 4px;
    padding: 1px 8px;
    font-size: 12px;
    font-weight: 700;
    font-family: 'Courier New', monospace;
    cursor: default;
    user-select: none;
    white-space: nowrap;
    line-height: 1.8;
  }
`;

function stripTokenSpans(html: string): string {
  return html.replace(
    /<span[^>]*class="renewal-token"[^>]*>([\s\S]*?)<\/span>/g,
    '$1',
  );
}

const EmailTemplateBuilder = forwardRef<BuilderHandle, Props>(
  ({ initialJson, initialHtml, tokens, height = '100%' }, ref) => {
    const editorRef = useRef<Editor | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const initialised = useRef(false);

    useImperativeHandle(ref, () => ({
      getData: () => {
        const editor = editorRef.current;
        if (!editor) return { editor_json: {}, compiled_html: '' };
        const rawHtml = editor.getHtml();
        const css = editor.getCss();
        const compiled_html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${css}</style>
</head>
<body>
${stripTokenSpans(rawHtml)}
</body>
</html>`;
        return {
          editor_json: editor.getProjectData(),
          compiled_html,
        };
      },
      loadData: (json: object) => {
        editorRef.current?.loadProjectData(json as any);
      },
    }));

    useEffect(() => {
      if (initialised.current || !containerRef.current) return;
      initialised.current = true;

      const editor = grapesjs.init({
        container: containerRef.current,
        fromElement: false,
        height,
        width: 'auto',
        storageManager: false,
        undoManager: { trackSelection: false },
        selectorManager: { componentFirst: true },
        plugins: [gjsPresetNewsletter],
        pluginsOpts: {
          [gjsPresetNewsletter as any]: {
            modalLabelImport: 'Paste raw HTML to import',
            modalLabelExport: 'Copy this HTML to use externally',
            codeViewerTheme: 'hopscotch',
            updateStyleManager: true,
            showStylesOnChange: true,
            useCustomTheme: false,
          },
        },
        canvas: {
          styles: [TOKEN_CANVAS_CSS],
        },
        styleManager: {
          sectors: [
            {
              name: 'General',
              open: false,
              buildProps: ['display', 'position', 'top', 'right', 'left', 'bottom', 'float'],
            },
            {
              name: 'Dimension',
              open: false,
              buildProps: ['width', 'height', 'max-width', 'min-height', 'margin', 'padding'],
            },
            {
              name: 'Typography',
              open: true,
              buildProps: [
                'font-family', 'font-size', 'font-weight', 'letter-spacing',
                'color', 'line-height', 'text-align', 'text-decoration',
              ],
            },
            {
              name: 'Decorations',
              open: false,
              buildProps: ['border-radius', 'border', 'box-shadow', 'background'],
            },
          ],
        },
      });

      editorRef.current = editor;

      // Group tokens by category and add as blocks
      const categories = [...new Set(tokens.map(t => t.category))];
      categories.forEach(cat => {
        tokens
          .filter(t => t.category === cat)
          .forEach(token => {
            editor.BlockManager.add(`token_${token.key}`, {
              label: `
                <div style="text-align:left;padding:2px 0">
                  <div style="font-size:11px;font-weight:700;color:#818cf8;font-family:monospace;word-break:break-all">
                    {{${token.key}}}
                  </div>
                  <div style="font-size:10px;color:#cbd5e1;margin-top:1px">${token.label}</div>
                </div>
              `,
              category: `📌 ${cat}`,
              content: `<span class="renewal-token" data-token="${token.key}" contenteditable="false">{{${token.key}}}</span>`,
              attributes: { title: `Insert ${token.label} token` },
            });
          });
      });

      // Load saved project data if provided
      if (initialJson && Object.keys(initialJson).length > 0) {
        try {
          editor.loadProjectData(initialJson as any);
        } catch {
          // Silently ignore malformed project data
        }
      } else if (initialHtml) {
        try {
          editor.setComponents(initialHtml);
        } catch (e) {
          console.error('Failed to import initial HTML into GrapesJS:', e);
        }
      }

      return () => {
        if (editorRef.current) {
          editorRef.current.destroy();
          editorRef.current = null;
          initialised.current = false;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div
        ref={containerRef}
        id="gjs-email-builder"
        className="h-full w-full"
        style={{ height }}
      />
    );
  },
);

EmailTemplateBuilder.displayName = 'EmailTemplateBuilder';
export default EmailTemplateBuilder;
