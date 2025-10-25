'use client';

import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';

export type RichTextEditorHandle = {
  getContent: () => string;
};

type RichTextEditorProps = {
  width?: number | string;
  height?: number | string;
  label?: string;
  value?: string;
  onChange?: (event: { target: { value: string } }) => void;
  error?: string;
};

const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, false] }],
  ['bold', 'italic', 'underline', 'strike'],
  ['blockquote', 'code-block'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  [{ script: 'sub' }, { script: 'super' }],
  [{ indent: '-1' }, { indent: '+1' }],
  [{ direction: 'rtl' }],
  ['link'],
  ['clean']
];

const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>((props, ref) => {
  // Focus Quill editor when clicking anywhere in the editor area (not toolbar/tabs)
  const handleEditorAreaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (editorRef.current && quillRef.current && tab === 'visual') {
      // Only focus if not clicking on toolbar/tabs
      const target = e.target as HTMLElement;
      if (
        target.closest('.ql-toolbar') ||
        target.tagName === 'BUTTON' ||
        target.closest('[role="button"]')
      ) {
        return;
      }
      quillRef.current.focus();
    }
  };
  const editorRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const [tab, setTab] = useState<'visual' | 'html'>('visual');
  const [html, setHtml] = useState(props.value || '');
  const [lastHtml, setLastHtml] = useState(props.value || '');

  useEffect(() => {
    if (editorRef.current && !quillRef.current) {
      quillRef.current = new Quill(editorRef.current, {
        theme: 'snow',
        modules: {
          toolbar: TOOLBAR_OPTIONS,
        },
        placeholder: 'Write something...',
      });

      // keep html in sync
      quillRef.current.on('text-change', () => {
  let htmlContent = quillRef.current!.root.innerHTML;
  // Normalize Quill empty value
  if (htmlContent.trim() === '<p><br></p>') htmlContent = '';
  setHtml(htmlContent);
  if (props.onChange) props.onChange({ target: { value: htmlContent } });
      });
      // Set initial value
      if (props.value) {
        quillRef.current.root.innerHTML = props.value;
        setHtml(props.value);
      }
    }
    return () => {
      if (quillRef.current && editorRef.current) {
        // Remove Quill toolbar and editor from DOM
        editorRef.current.innerHTML = '';
        quillRef.current = null;
      }
    };
  }, []);

  // Sync external value changes
  useEffect(() => {
    if (quillRef.current && props.value !== undefined && props.value !== quillRef.current.root.innerHTML) {
      quillRef.current.root.innerHTML = props.value;
      setHtml(props.value);
    }
  }, [props.value]);

  useImperativeHandle(ref, () => ({
    getContent: () => {
      if (quillRef.current) {
        return quillRef.current.root.innerHTML;
      }
      return '';
    },
  }));

  // hide/show toolbar when switching tabs
  useEffect(() => {
    const toolbar = editorRef.current?.previousElementSibling as HTMLElement | null;
    if (toolbar) {
      toolbar.style.display = tab === 'visual' ? '' : 'none';
    }
    // If switching from HTML to Visual and HTML was changed, update Quill
    if (tab === 'visual' && html !== lastHtml) {
      if (quillRef.current) {
        quillRef.current.setText(''); // Clear all content first
        quillRef.current.clipboard.dangerouslyPasteHTML(0, html);
        setLastHtml(html);
      }
    }
    // When switching to HTML tab, sync lastHtml to current html
    if (tab === 'html' && html !== lastHtml) {
      setLastHtml(html);
    }
  }, [tab]);

  // Responsive width and height
  const width = props.width ?? '100%';
  const minHeight = props.height ?? 180;

  return (
  <div style={{
      position: 'relative',
      border: '1px solid #ccc',
      borderRadius: 8,
      background: '#fff',
      width: width,
      maxWidth: '100%',
      minWidth: 240,
      boxSizing: 'border-box',
      padding: 0,
      boxShadow: 'none',
      margin: '0 auto',
      overflow: 'visible',
    }}>
      {props.label && (
        <label style={{
          position: 'absolute',
          top: -10,
          left: 12,
          background: '#fff',
          padding: '0 6px',
          color: '#6f6f6f',
          fontSize: '0.85rem',
          fontWeight: 500,
          letterSpacing: 0.01,
          zIndex: 2,
          lineHeight: 1,
        }}>{props.label}</label>
      )}
      <div
        style={{
          padding: '16px 12px 8px 12px',
          width: '100%',
          boxSizing: 'border-box',
        }}
        onClick={handleEditorAreaClick}
      >
        <div style={{ display: 'flex', borderBottom: '2px solid #eee', marginBottom: 0, paddingLeft: 24, paddingTop: 12 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <span style={{ display: 'inline-block', position: 'relative' }}>
              <button
                onClick={() => setTab('visual')}
                style={{
                  fontWeight: tab === 'visual' ? 600 : 400,
                  border: 'none',
                  background: 'none',
                  color: tab === 'visual' ? '#222' : '#888',
                  fontSize: '1em',
                  padding: '2px 8px 2px 0',
                  outline: 'none',
                  cursor: 'pointer',
                  lineHeight: 1.2,
                  transition: 'color 0.2s',
                }}
              >
                Visual
              </button>
              {tab === 'visual' && (
                <span style={{
                  display: 'block',
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: -2,
                  height: 0,
                  borderBottom: '2.5px solid #222',
                }} />
              )}
            </span>
            <span style={{ display: 'inline-block', position: 'relative' }}>
              <button
                onClick={() => setTab('html')}
                style={{
                  fontWeight: tab === 'html' ? 600 : 400,
                  border: 'none',
                  background: 'none',
                  color: tab === 'html' ? '#222' : '#888',
                  fontSize: '1em',
                  padding: '2px 8px 2px 0',
                  outline: 'none',
                  cursor: 'pointer',
                  lineHeight: 1.2,
                  transition: 'color 0.2s',
                }}
              >
                HTML
              </button>
              {tab === 'html' && (
                <span style={{
                  display: 'block',
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  bottom: -2,
                  height: 0,
                  borderBottom: '2.5px solid #222',
                }} />
              )}
            </span>
          </div>
        </div>
        <div style={{ position: 'relative', width: '100%' }}>
          <div
            ref={editorRef}
            style={{
              minHeight: minHeight,
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              overflow: 'auto',
            }}
          />
          {tab === 'html' && (
            <div style={{
              position: 'absolute',
              inset: 0,
              margin: 0,
              padding: 12,
              background: '#fafbfc',
              minHeight: minHeight,
              width: '100%',
              maxWidth: '100%',
              boxSizing: 'border-box',
              borderRadius: 0,
              overflow: 'auto',
            }}>
              <textarea
                style={{
                  width: '100%',
                  minHeight: minHeight,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontFamily: 'monospace',
                  fontSize: 15,
                  color: '#222',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  padding: 0,
                  overflow: 'auto',
                  display: 'block',
                }}
                value={html}
                onChange={e => setHtml(e.target.value)}
              />
            </div>
          )}
        </div>
        {props.error && (
          <div style={{ color: '#d32f2f', fontSize: 13, marginTop: 4, marginLeft: 2 }}>{props.error}</div>
        )}
      </div>
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';
export default RichTextEditor;
