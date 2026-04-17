(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/components/ui/badge.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Badge",
    ()=>Badge,
    "badgeVariants",
    ()=>badgeVariants
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$merge$2d$props$2f$mergeProps$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@base-ui/react/esm/merge-props/mergeProps.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$use$2d$render$2f$useRender$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@base-ui/react/esm/use-render/useRender.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/class-variance-authority/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
;
;
;
;
const badgeVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])("group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!", {
    variants: {
        variant: {
            default: "bg-primary text-primary-foreground [a]:hover:bg-primary/80",
            secondary: "bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80",
            destructive: "bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
            outline: "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
            ghost: "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
            link: "text-primary underline-offset-4 hover:underline"
        }
    },
    defaultVariants: {
        variant: "default"
    }
});
function Badge({ className, variant = "default", render, ...props }) {
    _s();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$use$2d$render$2f$useRender$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRender"])({
        defaultTagName: "span",
        props: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$merge$2d$props$2f$mergeProps$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["mergeProps"])({
            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(badgeVariants({
                variant
            }), className)
        }, props),
        render,
        state: {
            slot: "badge",
            variant
        }
    });
}
_s(Badge, "Yxn2JZFvED13KkqGsiyGOoQOkjM=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$use$2d$render$2f$useRender$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRender"]
    ];
});
_c = Badge;
;
var _c;
__turbopack_context__.k.register(_c, "Badge");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/workbench/status-badge.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "STATUS_TONE_BY_KEY",
    ()=>STATUS_TONE_BY_KEY,
    "StatusBadge",
    ()=>StatusBadge
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/badge.tsx [app-client] (ecmascript)");
;
;
const STATUS_TONE_BY_KEY = {
    passing: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
    pass: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
    approved: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
    accepted: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
    deployed: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
    promoted: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
    promote: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
    healthy: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
    open: "border-blue-300/35 bg-blue-400/12 text-blue-200",
    proposed: "border-blue-300/35 bg-blue-400/12 text-blue-200",
    parsed: "border-blue-300/35 bg-blue-400/12 text-blue-200",
    validated: "border-blue-300/35 bg-blue-400/12 text-blue-200",
    completed: "border-blue-300/35 bg-blue-400/12 text-blue-200",
    queued: "border-blue-300/35 bg-blue-400/12 text-blue-200",
    running: "border-blue-300/35 bg-blue-400/12 text-blue-200",
    canary: "border-sky-300/35 bg-sky-400/12 text-sky-200",
    shadow: "border-sky-300/35 bg-sky-400/12 text-sky-200",
    watch: "border-sky-300/35 bg-sky-400/12 text-sky-200",
    awaitingapproval: "border-amber-300/35 bg-amber-400/12 text-amber-200",
    needsreview: "border-amber-300/35 bg-amber-400/12 text-amber-200",
    requestchanges: "border-amber-300/35 bg-amber-400/12 text-amber-200",
    warning: "border-amber-300/35 bg-amber-400/12 text-amber-200",
    error: "border-rose-300/40 bg-rose-400/12 text-rose-200",
    note: "border-border/80 bg-surface-2/80 text-muted-foreground",
    fullengine: "border-emerald-300/35 bg-emerald-400/12 text-emerald-200",
    heuristic: "border-amber-300/35 bg-amber-400/12 text-amber-200",
    notavailable: "border-border/80 bg-surface-2/80 text-muted-foreground",
    high: "border-amber-300/35 bg-amber-400/12 text-amber-200",
    medium: "border-cyan-300/35 bg-cyan-400/10 text-cyan-100",
    low: "border-violet-300/30 bg-violet-400/10 text-violet-100",
    critical: "border-rose-300/40 bg-rose-400/12 text-rose-200",
    failing: "border-rose-300/40 bg-rose-400/12 text-rose-200",
    fail: "border-rose-300/40 bg-rose-400/12 text-rose-200",
    rejected: "border-rose-300/40 bg-rose-400/12 text-rose-200",
    rollback: "border-rose-300/40 bg-rose-400/12 text-rose-200",
    rolledback: "border-rose-300/40 bg-rose-400/12 text-rose-200",
    rollbackready: "border-rose-300/40 bg-rose-400/12 text-rose-200",
    blocked: "border-rose-300/40 bg-rose-400/12 text-rose-200",
    disabled: "border-border/80 bg-surface-2/80 text-muted-foreground",
    retired: "border-border/80 bg-surface-2/80 text-muted-foreground",
    notrun: "border-border/80 bg-surface-2/80 text-muted-foreground",
    needstuning: "border-amber-300/35 bg-amber-400/12 text-amber-200",
    ready: "border-amber-300/35 bg-amber-400/12 text-amber-200",
    notready: "border-rose-300/40 bg-rose-400/12 text-rose-200",
    monitoring: "border-border/80 bg-surface-2/80 text-muted-foreground",
    notscheduled: "border-border/80 bg-surface-2/80 text-muted-foreground",
    yara: "border-violet-300/30 bg-violet-400/10 text-violet-100",
    sigma: "border-blue-300/35 bg-blue-400/12 text-blue-200",
    snort: "border-cyan-300/35 bg-cyan-400/10 text-cyan-100",
    suricata: "border-sky-300/35 bg-sky-400/12 text-sky-200"
};
const DISPLAY_LABEL_BY_KEY = {
    yara: "YARA",
    sigma: "Sigma",
    snort: "Snort",
    suricata: "Suricata"
};
function normalize(value) {
    return value.replace(/\s|_|-/g, "").toLowerCase();
}
function formatStatusLabel(value) {
    const normalized = normalize(value);
    const mapped = DISPLAY_LABEL_BY_KEY[normalized];
    if (mapped) {
        return mapped;
    }
    if (value.includes(" ")) {
        return value;
    }
    return value.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/_/g, " ").replace(/\b\w/g, (match)=>match.toUpperCase());
}
function StatusBadge({ value }) {
    const normalized = normalize(value);
    const tone = STATUS_TONE_BY_KEY[normalized] ?? "border-border/80 bg-surface-2/80 text-muted-foreground";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Badge"], {
        variant: "outline",
        className: `rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.09em] ${tone}`,
        children: formatStatusLabel(value)
    }, void 0, false, {
        fileName: "[project]/src/components/workbench/status-badge.tsx",
        lineNumber: 89,
        columnNumber: 5
    }, this);
}
_c = StatusBadge;
var _c;
__turbopack_context__.k.register(_c, "StatusBadge");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/shared/api/error-classification.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "classifyUiError",
    ()=>classifyUiError
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/api/error.ts [app-client] (ecmascript)");
;
function fallbackMessage(error) {
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }
    return "Unexpected client or network failure.";
}
function apiErrorMessage(error) {
    if (error.detail && error.detail.trim()) {
        return error.detail;
    }
    if (error.title && error.title.trim()) {
        return error.title;
    }
    return error.message;
}
function classifyUiError(error, options = {}) {
    if (options.modeMisconfigured) {
        return {
            kind: "unavailable-configuration",
            isContractMismatch: false,
            status: null,
            message: "Runtime gateway mode is not configured. Set NEXT_PUBLIC_USE_ASPNET_GATEWAY to 0 or 1."
        };
    }
    if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ApiError"]) {
        const isSchemaMismatch = error.isSchemaValidationFailure;
        const hasDependencySignal = Boolean(error.dependency) || Boolean(error.condition) || Boolean(error.dependencyType) || error.retryable === true;
        if (error.status === 401 || error.status === 403) {
            return {
                kind: "permission-restricted",
                isContractMismatch: isSchemaMismatch,
                status: error.status,
                message: apiErrorMessage(error)
            };
        }
        if (error.status === 404 && options.treat404AsMissingFeature) {
            return {
                kind: "unavailable-missing-feature",
                isContractMismatch: isSchemaMismatch,
                status: error.status,
                message: apiErrorMessage(error)
            };
        }
        if (isSchemaMismatch || hasDependencySignal || error.status >= 500) {
            return {
                kind: "dependency-down",
                isContractMismatch: isSchemaMismatch,
                status: error.status,
                message: apiErrorMessage(error)
            };
        }
        return {
            kind: "unavailable",
            isContractMismatch: isSchemaMismatch,
            status: error.status,
            message: apiErrorMessage(error)
        };
    }
    return {
        kind: "dependency-down",
        isContractMismatch: false,
        status: null,
        message: fallbackMessage(error)
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/table.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Table",
    ()=>Table,
    "TableBody",
    ()=>TableBody,
    "TableCaption",
    ()=>TableCaption,
    "TableCell",
    ()=>TableCell,
    "TableFooter",
    ()=>TableFooter,
    "TableHead",
    ()=>TableHead,
    "TableHeader",
    ()=>TableHeader,
    "TableRow",
    ()=>TableRow
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
"use client";
;
;
function Table({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "table-container",
        className: "relative w-full overflow-x-auto",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("table", {
            "data-slot": "table",
            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full caption-bottom text-sm", className),
            ...props
        }, void 0, false, {
            fileName: "[project]/src/components/ui/table.tsx",
            lineNumber: 13,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/ui/table.tsx",
        lineNumber: 9,
        columnNumber: 5
    }, this);
}
_c = Table;
function TableHeader({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("thead", {
        "data-slot": "table-header",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("[&_tr]:border-b [&_tr]:border-border/70", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/table.tsx",
        lineNumber: 24,
        columnNumber: 5
    }, this);
}
_c1 = TableHeader;
function TableBody({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tbody", {
        "data-slot": "table-body",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("[&_tr:last-child]:border-0", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/table.tsx",
        lineNumber: 34,
        columnNumber: 5
    }, this);
}
_c2 = TableBody;
function TableFooter({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tfoot", {
        "data-slot": "table-footer",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("border-t border-border/70 bg-surface-2/70 font-medium [&>tr]:last:border-b-0", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/table.tsx",
        lineNumber: 44,
        columnNumber: 5
    }, this);
}
_c3 = TableFooter;
function TableRow({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("tr", {
        "data-slot": "table-row",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("border-b border-border/60 text-[13px] transition-colors hover:bg-surface-2/70 data-[state=selected]:bg-surface-2", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/table.tsx",
        lineNumber: 57,
        columnNumber: 5
    }, this);
}
_c4 = TableRow;
function TableHead({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("th", {
        "data-slot": "table-head",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("h-9 px-2.5 text-left align-middle text-[11px] font-semibold uppercase tracking-[0.08em] whitespace-nowrap text-muted-foreground [&:has([role=checkbox])]:pr-0", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/table.tsx",
        lineNumber: 70,
        columnNumber: 5
    }, this);
}
_c5 = TableHead;
function TableCell({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("td", {
        "data-slot": "table-cell",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("p-2.5 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/table.tsx",
        lineNumber: 83,
        columnNumber: 5
    }, this);
}
_c6 = TableCell;
function TableCaption({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("caption", {
        "data-slot": "table-caption",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("mt-4 text-sm text-muted-foreground", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/table.tsx",
        lineNumber: 99,
        columnNumber: 5
    }, this);
}
_c7 = TableCaption;
;
var _c, _c1, _c2, _c3, _c4, _c5, _c6, _c7;
__turbopack_context__.k.register(_c, "Table");
__turbopack_context__.k.register(_c1, "TableHeader");
__turbopack_context__.k.register(_c2, "TableBody");
__turbopack_context__.k.register(_c3, "TableFooter");
__turbopack_context__.k.register(_c4, "TableRow");
__turbopack_context__.k.register(_c5, "TableHead");
__turbopack_context__.k.register(_c6, "TableCell");
__turbopack_context__.k.register(_c7, "TableCaption");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/shared/ui/data-grid.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DataGrid",
    ()=>DataGrid
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$table$2f$build$2f$lib$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-table/build/lib/index.mjs [app-client] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$table$2d$core$2f$build$2f$lib$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/table-core/build/lib/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-down.js [app-client] (ecmascript) <export default as ArrowDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowUp$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/arrow-up.js [app-client] (ecmascript) <export default as ArrowUp>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevrons$2d$up$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronsUpDown$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/chevrons-up-down.js [app-client] (ecmascript) <export default as ChevronsUpDown>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/table.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
function SortIndicator({ direction }) {
    if (direction === "asc") {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$up$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowUp$3e$__["ArrowUp"], {
            className: "h-3.5 w-3.5 text-foreground"
        }, void 0, false, {
            fileName: "[project]/src/shared/ui/data-grid.tsx",
            lineNumber: 25,
            columnNumber: 12
        }, this);
    }
    if (direction === "desc") {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$arrow$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ArrowDown$3e$__["ArrowDown"], {
            className: "h-3.5 w-3.5 text-foreground"
        }, void 0, false, {
            fileName: "[project]/src/shared/ui/data-grid.tsx",
            lineNumber: 29,
            columnNumber: 12
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$chevrons$2d$up$2d$down$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ChevronsUpDown$3e$__["ChevronsUpDown"], {
        className: "h-3.5 w-3.5 text-muted-foreground/80"
    }, void 0, false, {
        fileName: "[project]/src/shared/ui/data-grid.tsx",
        lineNumber: 32,
        columnNumber: 10
    }, this);
}
_c = SortIndicator;
function DataGrid({ data, columns, onRowClick, rowClassName }) {
    _s();
    const [sorting, setSorting] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    // eslint-disable-next-line react-hooks/incompatible-library
    const table = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$table$2f$build$2f$lib$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["useReactTable"])({
        data,
        columns,
        state: {
            sorting
        },
        onSortingChange: setSorting,
        getCoreRowModel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$table$2d$core$2f$build$2f$lib$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getCoreRowModel"])(),
        getSortedRowModel: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$table$2d$core$2f$build$2f$lib$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getSortedRowModel"])()
    });
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "overflow-hidden rounded-xl border border-border/75 bg-surface-1/90",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Table"], {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableHeader"], {
                    className: "sticky top-0 z-10 bg-surface-2/85 backdrop-blur supports-[backdrop-filter]:bg-surface-2/75",
                    children: table.getHeaderGroups().map((headerGroup)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableRow"], {
                            className: "hover:bg-transparent",
                            children: headerGroup.headers.map((header)=>{
                                const canSort = header.column.getCanSort();
                                return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableHead"], {
                                    className: "h-9",
                                    children: header.isPlaceholder ? null : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: canSort ? header.column.getToggleSortingHandler() : undefined,
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("inline-flex w-full items-center gap-1.5 text-left", canSort ? "cursor-pointer" : "cursor-default"),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                className: "truncate",
                                                children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$table$2f$build$2f$lib$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["flexRender"])(header.column.columnDef.header, header.getContext())
                                            }, void 0, false, {
                                                fileName: "[project]/src/shared/ui/data-grid.tsx",
                                                lineNumber: 68,
                                                columnNumber: 25
                                            }, this),
                                            canSort ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SortIndicator, {
                                                direction: header.column.getIsSorted()
                                            }, void 0, false, {
                                                fileName: "[project]/src/shared/ui/data-grid.tsx",
                                                lineNumber: 71,
                                                columnNumber: 36
                                            }, this) : null
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/shared/ui/data-grid.tsx",
                                        lineNumber: 60,
                                        columnNumber: 23
                                    }, this)
                                }, header.id, false, {
                                    fileName: "[project]/src/shared/ui/data-grid.tsx",
                                    lineNumber: 58,
                                    columnNumber: 19
                                }, this);
                            })
                        }, headerGroup.id, false, {
                            fileName: "[project]/src/shared/ui/data-grid.tsx",
                            lineNumber: 53,
                            columnNumber: 13
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/src/shared/ui/data-grid.tsx",
                    lineNumber: 51,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableBody"], {
                    children: table.getRowModel().rows.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableRow"], {
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableCell"], {
                            colSpan: columns.length,
                            className: "h-28 text-center text-sm text-muted-foreground",
                            children: "No matching alert data."
                        }, void 0, false, {
                            fileName: "[project]/src/shared/ui/data-grid.tsx",
                            lineNumber: 84,
                            columnNumber: 15
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/shared/ui/data-grid.tsx",
                        lineNumber: 83,
                        columnNumber: 13
                    }, this) : table.getRowModel().rows.map((row)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableRow"], {
                            tabIndex: onRowClick ? 0 : undefined,
                            className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("h-10", onRowClick ? "cursor-pointer focus-visible:bg-surface-2/85 focus-visible:outline-none" : "", rowClassName),
                            onClick: onRowClick ? ()=>onRowClick(row.original) : undefined,
                            onKeyDown: onRowClick ? (event)=>{
                                if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    onRowClick(row.original);
                                }
                            } : undefined,
                            children: row.getVisibleCells().map((cell)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableCell"], {
                                    className: "py-2.5",
                                    children: (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$table$2f$build$2f$lib$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["flexRender"])(cell.column.columnDef.cell, cell.getContext())
                                }, cell.id, false, {
                                    fileName: "[project]/src/shared/ui/data-grid.tsx",
                                    lineNumber: 113,
                                    columnNumber: 19
                                }, this))
                        }, row.id, false, {
                            fileName: "[project]/src/shared/ui/data-grid.tsx",
                            lineNumber: 90,
                            columnNumber: 15
                        }, this))
                }, void 0, false, {
                    fileName: "[project]/src/shared/ui/data-grid.tsx",
                    lineNumber: 81,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/shared/ui/data-grid.tsx",
            lineNumber: 50,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/shared/ui/data-grid.tsx",
        lineNumber: 49,
        columnNumber: 5
    }, this);
}
_s(DataGrid, "qg5rok0fZeVwH4q3itwzrlIy2qs=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$table$2f$build$2f$lib$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$locals$3e$__["useReactTable"]
    ];
});
_c1 = DataGrid;
var _c, _c1;
__turbopack_context__.k.register(_c, "SortIndicator");
__turbopack_context__.k.register(_c1, "DataGrid");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/shared/ui/error-fallback.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ClassifiedFailureState",
    ()=>ClassifiedFailureState
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/ui/state-panels.tsx [app-client] (ecmascript)");
;
;
function ClassifiedFailureState({ failure, fallbackTitle }) {
    if (failure.kind === "permission-restricted") {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PermissionRestrictedState"], {
            title: "Permission restricted",
            description: "Your role cannot access this backend surface."
        }, void 0, false, {
            fileName: "[project]/src/shared/ui/error-fallback.tsx",
            lineNumber: 13,
            columnNumber: 7
        }, this);
    }
    if (failure.kind === "dependency-down") {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DependencyDownState"], {
            title: "Dependency down",
            description: failure.isContractMismatch ? "This surface is not mapped to the current backend shape yet. An empty or reduced view is expected until that module is integrated." : "A required backend dependency is currently unavailable."
        }, void 0, false, {
            fileName: "[project]/src/shared/ui/error-fallback.tsx",
            lineNumber: 22,
            columnNumber: 7
        }, this);
    }
    if (failure.kind === "unavailable-configuration") {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["UnavailableState"], {
            title: "Configuration unavailable",
            description: failure.message
        }, void 0, false, {
            fileName: "[project]/src/shared/ui/error-fallback.tsx",
            lineNumber: 34,
            columnNumber: 12
        }, this);
    }
    if (failure.kind === "unavailable-missing-feature") {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["UnavailableState"], {
            title: fallbackTitle,
            description: "Backend feature support is not available for this surface yet."
        }, void 0, false, {
            fileName: "[project]/src/shared/ui/error-fallback.tsx",
            lineNumber: 39,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["UnavailableState"], {
        title: fallbackTitle,
        description: failure.message
    }, void 0, false, {
        fileName: "[project]/src/shared/ui/error-fallback.tsx",
        lineNumber: 46,
        columnNumber: 10
    }, this);
}
_c = ClassifiedFailureState;
var _c;
__turbopack_context__.k.register(_c, "ClassifiedFailureState");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/app/(workbench)/overview/page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>OverviewPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$status$2d$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/workbench/status-badge.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2d$classification$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/api/error-classification.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/gateway/index.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/query/use-workbench-query.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$data$2d$grid$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/ui/data-grid.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$error$2d$fallback$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/ui/error-fallback.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$motion$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/ui/motion.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/ui/state-panels.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
;
;
;
;
;
const columns = [
    {
        accessorKey: "title",
        header: "Alert",
        cell: ({ row })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                href: `/alerts/${row.original.id}`,
                className: "text-xs font-medium text-foreground hover:underline",
                children: row.original.title
            }, void 0, false, {
                fileName: "[project]/src/app/(workbench)/overview/page.tsx",
                lineNumber: 21,
                columnNumber: 7
            }, ("TURBOPACK compile-time value", void 0))
    },
    {
        accessorKey: "severity",
        header: "Severity",
        cell: ({ row })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$status$2d$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StatusBadge"], {
                value: row.original.severity
            }, void 0, false, {
                fileName: "[project]/src/app/(workbench)/overview/page.tsx",
                lineNumber: 29,
                columnNumber: 24
            }, ("TURBOPACK compile-time value", void 0))
    },
    {
        accessorKey: "status",
        header: "Status",
        cell: ({ row })=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$status$2d$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StatusBadge"], {
                value: row.original.status
            }, void 0, false, {
                fileName: "[project]/src/app/(workbench)/overview/page.tsx",
                lineNumber: 34,
                columnNumber: 24
            }, ("TURBOPACK compile-time value", void 0))
    },
    {
        accessorKey: "ownerUserId",
        header: "Owner"
    },
    {
        accessorKey: "updatedAtUtc",
        header: "Updated",
        cell: ({ row })=>new Date(row.original.updatedAtUtc).toLocaleString()
    }
];
function MetricCard({ label, value, description }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "rounded-lg border border-border/70 bg-surface-2/65 p-3",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "wb-kicker",
                children: label
            }, void 0, false, {
                fileName: "[project]/src/app/(workbench)/overview/page.tsx",
                lineNumber: 58,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-1 text-2xl font-semibold tracking-tight",
                children: value
            }, void 0, false, {
                fileName: "[project]/src/app/(workbench)/overview/page.tsx",
                lineNumber: 59,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-1 text-xs text-muted-foreground",
                children: description
            }, void 0, false, {
                fileName: "[project]/src/app/(workbench)/overview/page.tsx",
                lineNumber: 60,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(workbench)/overview/page.tsx",
        lineNumber: 57,
        columnNumber: 5
    }, this);
}
_c = MetricCard;
function OverviewPage() {
    _s();
    if (!__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isModeConfigured"]) {
        const failure = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2d$classification$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["classifyUiError"])(null, {
            modeMisconfigured: true
        });
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$error$2d$fallback$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ClassifiedFailureState"], {
            failure: failure,
            fallbackTitle: "Overview unavailable"
        }, void 0, false, {
            fileName: "[project]/src/app/(workbench)/overview/page.tsx",
            lineNumber: 68,
            columnNumber: 12
        }, this);
    }
    const alertsQuery = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"])([
        "overview",
        "alerts"
    ], {
        "OverviewPage.useWorkbenchQuery[alertsQuery]": (signal)=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["gateway"].listAlertRegistry({
                page: 1,
                pageSize: 12
            }, signal)
    }["OverviewPage.useWorkbenchQuery[alertsQuery]"]);
    const serversQuery = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"])([
        "overview",
        "servers"
    ], {
        "OverviewPage.useWorkbenchQuery[serversQuery]": (signal)=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["gateway"].listManagedServers({
                page: 1,
                pageSize: 1
            }, signal)
    }["OverviewPage.useWorkbenchQuery[serversQuery]"]);
    const reportsQuery = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"])([
        "overview",
        "reports"
    ], {
        "OverviewPage.useWorkbenchQuery[reportsQuery]": (signal)=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["gateway"].listReports({
                page: 1,
                pageSize: 1
            }, signal)
    }["OverviewPage.useWorkbenchQuery[reportsQuery]"]);
    const detectionsQuery = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"])([
        "overview",
        "detections"
    ], {
        "OverviewPage.useWorkbenchQuery[detectionsQuery]": (signal)=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["gateway"].listDetections({
                page: 1,
                pageSize: 1
            }, signal)
    }["OverviewPage.useWorkbenchQuery[detectionsQuery]"]);
    if (alertsQuery.isLoading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LoadingState"], {
            label: "Loading overview"
        }, void 0, false, {
            fileName: "[project]/src/app/(workbench)/overview/page.tsx",
            lineNumber: 89,
            columnNumber: 12
        }, this);
    }
    if (alertsQuery.isError || !alertsQuery.data) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$error$2d$fallback$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ClassifiedFailureState"], {
            failure: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2d$classification$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["classifyUiError"])(alertsQuery.error),
            fallbackTitle: "Overview unavailable"
        }, void 0, false, {
            fileName: "[project]/src/app/(workbench)/overview/page.tsx",
            lineNumber: 93,
            columnNumber: 12
        }, this);
    }
    const alerts = alertsQuery.data.items;
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].section, {
        className: "wb-page",
        variants: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$motion$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["staggerMotion"],
        initial: "hidden",
        animate: "visible",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].header, {
                className: "wb-page-header",
                variants: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$motion$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["panelMotion"],
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "flex flex-wrap items-start justify-between gap-3",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "wb-kicker",
                                    children: "Overview"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(workbench)/overview/page.tsx",
                                    lineNumber: 103,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                                    className: "mt-1 text-lg font-semibold tracking-tight",
                                    children: "Live posture across alerts, servers, detections, and reports"
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(workbench)/overview/page.tsx",
                                    lineNumber: 104,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                    className: "mt-1 text-sm text-muted-foreground",
                                    children: "Overview cards only show totals backed by current ASP.NET contracts. Recent alerts below come from the first live result page."
                                }, void 0, false, {
                                    fileName: "[project]/src/app/(workbench)/overview/page.tsx",
                                    lineNumber: 105,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/app/(workbench)/overview/page.tsx",
                            lineNumber: 102,
                            columnNumber: 11
                        }, this),
                        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isMockMode"] ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SimulatedBadge"], {}, void 0, false, {
                            fileName: "[project]/src/app/(workbench)/overview/page.tsx",
                            lineNumber: 109,
                            columnNumber: 25
                        }, this) : null
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/app/(workbench)/overview/page.tsx",
                    lineNumber: 101,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/app/(workbench)/overview/page.tsx",
                lineNumber: 100,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].article, {
                className: "grid gap-3 sm:grid-cols-2 xl:grid-cols-4",
                variants: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$motion$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["panelMotion"],
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(MetricCard, {
                        label: "Indexed Alerts",
                        value: String(alertsQuery.data.totalCount),
                        description: "Current alert registry total."
                    }, void 0, false, {
                        fileName: "[project]/src/app/(workbench)/overview/page.tsx",
                        lineNumber: 114,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(MetricCard, {
                        label: "Managed Servers",
                        value: serversQuery.isSuccess ? String(serversQuery.data.totalServers) : "--",
                        description: serversQuery.isSuccess ? "Persisted server inventory." : "Server inventory temporarily unavailable."
                    }, void 0, false, {
                        fileName: "[project]/src/app/(workbench)/overview/page.tsx",
                        lineNumber: 119,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(MetricCard, {
                        label: "Detections",
                        value: detectionsQuery.isSuccess ? String(detectionsQuery.data.total) : "--",
                        description: detectionsQuery.isSuccess ? "Indexed detection history." : "Detection history temporarily unavailable."
                    }, void 0, false, {
                        fileName: "[project]/src/app/(workbench)/overview/page.tsx",
                        lineNumber: 124,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(MetricCard, {
                        label: "Reports",
                        value: reportsQuery.isSuccess ? String(reportsQuery.data.totalCount) : "--",
                        description: reportsQuery.isSuccess ? "Generated report artifacts." : "Reporting index temporarily unavailable."
                    }, void 0, false, {
                        fileName: "[project]/src/app/(workbench)/overview/page.tsx",
                        lineNumber: 129,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(workbench)/overview/page.tsx",
                lineNumber: 113,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].article, {
                className: "wb-panel",
                variants: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$motion$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["panelMotion"],
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-3 flex items-center justify-between gap-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "text-sm font-semibold tracking-tight",
                                children: "Recent Alerts"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(workbench)/overview/page.tsx",
                                lineNumber: 138,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: "/alerts",
                                className: "text-xs text-primary hover:underline",
                                children: "Open alert registry"
                            }, void 0, false, {
                                fileName: "[project]/src/app/(workbench)/overview/page.tsx",
                                lineNumber: 139,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/app/(workbench)/overview/page.tsx",
                        lineNumber: 137,
                        columnNumber: 9
                    }, this),
                    alerts.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EmptyState"], {
                        title: "No alerts available",
                        description: "Alerts will appear once telemetry intake produces persisted detections."
                    }, void 0, false, {
                        fileName: "[project]/src/app/(workbench)/overview/page.tsx",
                        lineNumber: 145,
                        columnNumber: 11
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$data$2d$grid$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DataGrid"], {
                        data: alerts,
                        columns: columns
                    }, void 0, false, {
                        fileName: "[project]/src/app/(workbench)/overview/page.tsx",
                        lineNumber: 147,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/app/(workbench)/overview/page.tsx",
                lineNumber: 136,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/app/(workbench)/overview/page.tsx",
        lineNumber: 99,
        columnNumber: 5
    }, this);
}
_s(OverviewPage, "Lq8jtWsGPwpd55CkFkhnW1zX/dU=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"]
    ];
});
_c1 = OverviewPage;
var _c, _c1;
__turbopack_context__.k.register(_c, "MetricCard");
__turbopack_context__.k.register(_c1, "OverviewPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_86f01240._.js.map