"use client"

import Editor, { DiffEditor, type OnMount } from "@monaco-editor/react"
import { GitCompare } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { DetectionRuleItem } from "@/shared/modules/types"
import { monacoLanguageForFamily } from "./helpers"

type MonacoRuleEditorProps = {
  rule: DetectionRuleItem
  code: string
  originalCode: string
  showDiff: boolean
  onCodeChange: (nextValue: string | undefined) => void
  onToggleDiff: (showDiff: boolean) => void
}

export function MonacoRuleEditor({
  rule,
  code,
  originalCode,
  showDiff,
  onCodeChange,
  onToggleDiff,
}: MonacoRuleEditorProps) {
  const onMount: OnMount = (instance) => {
    instance.updateOptions({
      fontSize: 13,
      fontFamily: "var(--font-workbench-mono), 'JetBrains Mono Variable', monospace",
      lineHeight: 1.55,
      minimap: { enabled: false },
      smoothScrolling: true,
      padding: { top: 14, bottom: 14 },
    })
  }

  const beforeMount = (monaco: typeof import("monaco-editor")) => {
    monaco.editor.defineTheme("ioc-manager-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#121820",
        "editor.lineHighlightBackground": "#172231",
        "editorGutter.background": "#121820",
        "editorCursor.foreground": "#7fc9ff",
      },
    })
  }

  return (
    <div className="rounded-xl border border-border/70 bg-surface-1/90">
      <div className="flex items-center justify-between border-b border-border/70 px-3 py-2.5">
        <div>
          <p className="text-sm font-semibold tracking-tight">{rule.name}</p>
          <p className="text-[11px] text-muted-foreground">
            {rule.id} | {rule.family} | {rule.owner}
          </p>
        </div>
        <div className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-surface-2/70 p-1">
          <Button
            size="sm"
            variant={showDiff ? "ghost" : "secondary"}
            className="h-7 text-xs"
            onClick={() => onToggleDiff(false)}
            data-testid="editor-edit-mode"
          >
            Edit
          </Button>
          <Button
            size="sm"
            variant={showDiff ? "secondary" : "ghost"}
            className="h-7 text-xs"
            onClick={() => onToggleDiff(true)}
            data-testid="editor-diff-mode"
          >
            <GitCompare className="mr-1.5 h-3.5 w-3.5" />
            Diff
          </Button>
        </div>
      </div>

      <div className="h-[368px]">
        {showDiff ? (
          <DiffEditor
            language={monacoLanguageForFamily(rule.family)}
            original={originalCode}
            modified={code}
            theme="ioc-manager-dark"
            beforeMount={beforeMount}
            options={{
              fontSize: 13,
              fontFamily: "var(--font-workbench-mono), 'JetBrains Mono Variable', monospace",
              minimap: { enabled: false },
              lineNumbersMinChars: 3,
              renderSideBySide: true,
              readOnly: false,
              padding: { top: 14, bottom: 14 },
            }}
            onMount={(instance) => {
              instance.getModifiedEditor().onDidChangeModelContent(() => {
                onCodeChange(instance.getModifiedEditor().getValue())
              })
            }}
          />
        ) : (
          <Editor
            value={code}
            language={monacoLanguageForFamily(rule.family)}
            onChange={onCodeChange}
            theme="ioc-manager-dark"
            beforeMount={beforeMount}
            onMount={onMount}
            options={{
              lineNumbersMinChars: 3,
              scrollBeyondLastLine: false,
              renderWhitespace: "selection",
              bracketPairColorization: { enabled: true },
              wordWrap: "on",
            }}
          />
        )}
      </div>
    </div>
  )
}

