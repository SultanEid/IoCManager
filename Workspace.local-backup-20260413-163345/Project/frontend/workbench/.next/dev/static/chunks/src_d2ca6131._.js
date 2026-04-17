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
"[project]/src/components/workbench/distribution/rule-distribution-page.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RuleDistributionPage",
    ()=>RuleDistributionPage
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/useMutation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/QueryClientProvider.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$status$2d$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/workbench/status-badge.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/input.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/table.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$textarea$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/textarea.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2d$classification$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/api/error-classification.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$auth$2f$auth$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/auth/auth-provider.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/gateway/index.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/query/use-workbench-query.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$error$2d$fallback$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/ui/error-fallback.tsx [app-client] (ecmascript)");
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
;
;
;
const JOB_STATUS_FILTERS = [
    "Queued",
    "Running",
    "Retrying",
    "Succeeded",
    "Partial",
    "Failed",
    "Canceled"
];
function formatTime(value) {
    if (!value) {
        return "-";
    }
    return new Date(value).toLocaleString();
}
function isRetryCandidate(job) {
    return (job.status === "Failed" || job.status === "Partial") && job.attemptCount < job.maxAttempts;
}
function toUtcDateWindowStart(value) {
    if (!value) {
        return null;
    }
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    return date.toISOString();
}
function toUtcDateWindowEnd(value) {
    if (!value) {
        return null;
    }
    const date = new Date(`${value}T23:59:59.999`);
    if (Number.isNaN(date.getTime())) {
        return null;
    }
    return date.toISOString();
}
function RuleDistributionPage() {
    _s();
    const queryClient = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryClient"])();
    const { session } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$auth$2f$auth$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const sessionOperatorUserId = session?.userId ?? session?.username ?? "";
    const [selectedRuleId, setSelectedRuleId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [selectedTargetIds, setSelectedTargetIds] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const [selectedGroupIds, setSelectedGroupIds] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])({});
    const [operatorUserId, setOperatorUserId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(sessionOperatorUserId);
    const [notes, setNotes] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [maxAttempts, setMaxAttempts] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("5");
    const [createError, setCreateError] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const [statusFilter, setStatusFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [operatorFilter, setOperatorFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [ruleFamilyFilter, setRuleFamilyFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [targetFilter, setTargetFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [groupFilter, setGroupFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [fromFilter, setFromFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [toFilter, setToFilter] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const [selectedJobId, setSelectedJobId] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(null);
    const resolvedOperatorUserId = operatorUserId.trim();
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "RuleDistributionPage.useEffect": ()=>{
            setOperatorUserId(sessionOperatorUserId);
        }
    }["RuleDistributionPage.useEffect"], [
        sessionOperatorUserId
    ]);
    const ruleListQuery = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"])([
        "distribution",
        "rules"
    ], {
        "RuleDistributionPage.useWorkbenchQuery[ruleListQuery]": (signal)=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["gateway"].listRuleRepository({
                page: 1,
                pageSize: 200,
                sort: "updated_desc"
            }, signal)
    }["RuleDistributionPage.useWorkbenchQuery[ruleListQuery]"]);
    const targetServersQuery = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"])([
        "distribution",
        "target-servers"
    ], {
        "RuleDistributionPage.useWorkbenchQuery[targetServersQuery]": (signal)=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["gateway"].listTargetServers(undefined, signal)
    }["RuleDistributionPage.useWorkbenchQuery[targetServersQuery]"]);
    const targetGroupsQuery = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"])([
        "distribution",
        "target-groups"
    ], {
        "RuleDistributionPage.useWorkbenchQuery[targetGroupsQuery]": (signal)=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["gateway"].listTargetGroups(signal)
    }["RuleDistributionPage.useWorkbenchQuery[targetGroupsQuery]"]);
    const selectedRuleDetailQuery = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"])([
        "distribution",
        "rule-detail",
        selectedRuleId
    ], {
        "RuleDistributionPage.useWorkbenchQuery[selectedRuleDetailQuery]": (signal)=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["gateway"].getRuleDetail(selectedRuleId, signal)
    }["RuleDistributionPage.useWorkbenchQuery[selectedRuleDetailQuery]"], {
        enabled: selectedRuleId.length > 0
    });
    const filters = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "RuleDistributionPage.useMemo[filters]": ()=>{
            const mapped = {
                take: 200
            };
            if (statusFilter) {
                mapped.status = statusFilter;
            }
            if (operatorFilter) {
                mapped.operatorUserId = operatorFilter.trim();
            }
            if (ruleFamilyFilter) {
                mapped.ruleFamily = ruleFamilyFilter.trim().toLowerCase();
            }
            if (targetFilter) {
                mapped.targetServerId = targetFilter;
            }
            if (groupFilter) {
                mapped.targetGroupId = groupFilter;
            }
            const queuedFromUtc = toUtcDateWindowStart(fromFilter);
            if (queuedFromUtc) {
                mapped.queuedFromUtc = queuedFromUtc;
            }
            const queuedToUtc = toUtcDateWindowEnd(toFilter);
            if (queuedToUtc) {
                mapped.queuedToUtc = queuedToUtc;
            }
            return mapped;
        }
    }["RuleDistributionPage.useMemo[filters]"], [
        fromFilter,
        groupFilter,
        operatorFilter,
        ruleFamilyFilter,
        statusFilter,
        targetFilter,
        toFilter
    ]);
    const jobsQuery = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"])([
        "distribution",
        "jobs",
        filters
    ], {
        "RuleDistributionPage.useWorkbenchQuery[jobsQuery]": (signal)=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["gateway"].listDistributionJobs(filters, signal)
    }["RuleDistributionPage.useWorkbenchQuery[jobsQuery]"], {
        refetchInterval: 10000
    });
    const selectedJobAttemptsQuery = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"])([
        "distribution",
        "job",
        selectedJobId,
        "attempts"
    ], {
        "RuleDistributionPage.useWorkbenchQuery[selectedJobAttemptsQuery]": (signal)=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["gateway"].listDistributionJobAttempts(selectedJobId, signal)
    }["RuleDistributionPage.useWorkbenchQuery[selectedJobAttemptsQuery]"], {
        enabled: selectedJobId !== null,
        refetchInterval: 10000
    });
    const selectedJobTargetsQuery = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"])([
        "distribution",
        "job",
        selectedJobId,
        "targets"
    ], {
        "RuleDistributionPage.useWorkbenchQuery[selectedJobTargetsQuery]": (signal)=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["gateway"].listDistributionJobTargets(selectedJobId, signal)
    }["RuleDistributionPage.useWorkbenchQuery[selectedJobTargetsQuery]"], {
        enabled: selectedJobId !== null,
        refetchInterval: 10000
    });
    const selectedJob = (jobsQuery.data ?? []).find((job)=>job.id === selectedJobId) ?? null;
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "RuleDistributionPage.useEffect": ()=>{
            const jobs = jobsQuery.data ?? [];
            if (jobs.length === 0) {
                if (selectedJobId !== null) {
                    setSelectedJobId(null);
                }
                return;
            }
            if (selectedJobId && jobs.some({
                "RuleDistributionPage.useEffect": (job)=>job.id === selectedJobId
            }["RuleDistributionPage.useEffect"])) {
                return;
            }
            setSelectedJobId(jobs[0].id);
        }
    }["RuleDistributionPage.useEffect"], [
        jobsQuery.data,
        selectedJobId
    ]);
    const createMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMutation"])({
        mutationFn: {
            "RuleDistributionPage.useMutation[createMutation]": async ()=>{
                const selectedTargetServerIds = Object.entries(selectedTargetIds).filter({
                    "RuleDistributionPage.useMutation[createMutation].selectedTargetServerIds": ([, selected])=>selected
                }["RuleDistributionPage.useMutation[createMutation].selectedTargetServerIds"]).map({
                    "RuleDistributionPage.useMutation[createMutation].selectedTargetServerIds": ([id])=>id
                }["RuleDistributionPage.useMutation[createMutation].selectedTargetServerIds"]);
                const selectedTargetGroupIds = Object.entries(selectedGroupIds).filter({
                    "RuleDistributionPage.useMutation[createMutation].selectedTargetGroupIds": ([, selected])=>selected
                }["RuleDistributionPage.useMutation[createMutation].selectedTargetGroupIds"]).map({
                    "RuleDistributionPage.useMutation[createMutation].selectedTargetGroupIds": ([id])=>id
                }["RuleDistributionPage.useMutation[createMutation].selectedTargetGroupIds"]);
                if (selectedTargetServerIds.length === 0 && selectedTargetGroupIds.length === 0) {
                    throw new Error("Select at least one target server or target group.");
                }
                const revisionId = selectedRuleDetailQuery.data?.currentRevision.id;
                if (!revisionId) {
                    throw new Error("Select a rule and wait for current revision to load.");
                }
                const parsedMaxAttempts = Number.parseInt(maxAttempts, 10);
                const payload = {
                    ruleRevisionId: revisionId,
                    targetServerIds: selectedTargetServerIds,
                    targetGroupIds: selectedTargetGroupIds,
                    operatorUserId: resolvedOperatorUserId,
                    notes: notes.trim() || undefined,
                    maxAttempts: Number.isFinite(parsedMaxAttempts) ? parsedMaxAttempts : undefined
                };
                return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["gateway"].createDistributionJob(payload);
            }
        }["RuleDistributionPage.useMutation[createMutation]"],
        onSuccess: {
            "RuleDistributionPage.useMutation[createMutation]": async (job)=>{
                setCreateError(null);
                setSelectedJobId(job.id);
                setNotes("");
                await queryClient.invalidateQueries({
                    queryKey: [
                        "distribution",
                        "jobs"
                    ]
                });
            }
        }["RuleDistributionPage.useMutation[createMutation]"],
        onError: {
            "RuleDistributionPage.useMutation[createMutation]": (error)=>{
                setCreateError((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2d$classification$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["classifyUiError"])(error).message);
            }
        }["RuleDistributionPage.useMutation[createMutation]"]
    });
    const retryMutation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMutation"])({
        mutationFn: {
            "RuleDistributionPage.useMutation[retryMutation]": async (jobId)=>{
                const payload = {
                    actorUserId: resolvedOperatorUserId,
                    notes: `Manual retry requested by ${resolvedOperatorUserId || "operator"}.`
                };
                return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["gateway"].retryDistributionJob(jobId, payload);
            }
        }["RuleDistributionPage.useMutation[retryMutation]"],
        onSuccess: {
            "RuleDistributionPage.useMutation[retryMutation]": async ()=>{
                await Promise.all([
                    queryClient.invalidateQueries({
                        queryKey: [
                            "distribution",
                            "jobs"
                        ]
                    }),
                    queryClient.invalidateQueries({
                        queryKey: [
                            "distribution",
                            "job"
                        ]
                    })
                ]);
            }
        }["RuleDistributionPage.useMutation[retryMutation]"]
    });
    if (ruleListQuery.isLoading || targetServersQuery.isLoading || targetGroupsQuery.isLoading || jobsQuery.isLoading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LoadingState"], {
            label: "Loading distribution workflow"
        }, void 0, false, {
            fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
            lineNumber: 224,
            columnNumber: 12
        }, this);
    }
    if (ruleListQuery.isError) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$error$2d$fallback$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ClassifiedFailureState"], {
            failure: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2d$classification$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["classifyUiError"])(ruleListQuery.error),
            fallbackTitle: "Rule distribution unavailable"
        }, void 0, false, {
            fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
            lineNumber: 228,
            columnNumber: 12
        }, this);
    }
    if (targetServersQuery.isError) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$error$2d$fallback$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ClassifiedFailureState"], {
            failure: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2d$classification$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["classifyUiError"])(targetServersQuery.error),
            fallbackTitle: "Rule distribution unavailable"
        }, void 0, false, {
            fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
            lineNumber: 231,
            columnNumber: 12
        }, this);
    }
    if (targetGroupsQuery.isError) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$error$2d$fallback$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ClassifiedFailureState"], {
            failure: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2d$classification$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["classifyUiError"])(targetGroupsQuery.error),
            fallbackTitle: "Rule distribution unavailable"
        }, void 0, false, {
            fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
            lineNumber: 234,
            columnNumber: 12
        }, this);
    }
    if (jobsQuery.isError) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$error$2d$fallback$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ClassifiedFailureState"], {
            failure: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2d$classification$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["classifyUiError"])(jobsQuery.error),
            fallbackTitle: "Rule distribution unavailable"
        }, void 0, false, {
            fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
            lineNumber: 237,
            columnNumber: 12
        }, this);
    }
    const rules = ruleListQuery.data?.items ?? [];
    const targetServers = targetServersQuery.data ?? [];
    const targetGroups = targetGroupsQuery.data ?? [];
    const jobs = jobsQuery.data ?? [];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
        className: "wb-page space-y-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                className: "wb-page-header",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "wb-kicker",
                        children: "Rule Distribution"
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                        lineNumber: 248,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h2", {
                        className: "mt-1 text-lg font-semibold tracking-tight",
                        children: "Live distribution jobs and per-target execution state"
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                        lineNumber: 249,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "mt-1 text-sm text-muted-foreground",
                        children: "This workflow is backed only by persisted distribution jobs, attempts, and target outcomes from the backend."
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                        lineNumber: 250,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                lineNumber: 247,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
                className: "wb-panel space-y-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "text-sm font-semibold tracking-tight",
                        children: "Create Distribution Job"
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                        lineNumber: 256,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid gap-3 md:grid-cols-3",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "space-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "wb-kicker",
                                        children: "Rule"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 259,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        value: selectedRuleId,
                                        onChange: (event)=>setSelectedRuleId(event.target.value),
                                        className: "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "",
                                                children: "Select rule"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                lineNumber: 265,
                                                columnNumber: 15
                                            }, this),
                                            rules.map((rule)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: rule.id,
                                                    children: [
                                                        rule.name,
                                                        " (",
                                                        rule.ruleFamily,
                                                        ") r",
                                                        rule.currentRevisionNumber
                                                    ]
                                                }, rule.id, true, {
                                                    fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                    lineNumber: 267,
                                                    columnNumber: 17
                                                }, this))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 260,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                lineNumber: 258,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "space-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "wb-kicker",
                                        children: "Operator"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 275,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                        value: operatorUserId,
                                        onChange: (event)=>setOperatorUserId(event.target.value),
                                        placeholder: "Current session or operator id"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 276,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                lineNumber: 274,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "space-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "wb-kicker",
                                        children: "Max Attempts"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 280,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                        value: maxAttempts,
                                        onChange: (event)=>setMaxAttempts(event.target.value)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 281,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                lineNumber: 279,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                        lineNumber: 257,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid gap-3 md:grid-cols-2",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-2 rounded-lg border border-border/70 bg-surface-2/55 p-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "wb-kicker",
                                        children: "Target Servers"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 287,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "max-h-48 space-y-1 overflow-y-auto",
                                        children: targetServers.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-muted-foreground",
                                            children: "No target servers available."
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                            lineNumber: 290,
                                            columnNumber: 17
                                        }, this) : targetServers.map((server)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "flex items-center justify-between gap-2 text-xs",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: [
                                                            server.hostname,
                                                            " (",
                                                            server.ipAddress,
                                                            ")"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                        lineNumber: 294,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "checkbox",
                                                        checked: Boolean(selectedTargetIds[server.id]),
                                                        onChange: (event)=>setSelectedTargetIds((current)=>({
                                                                    ...current,
                                                                    [server.id]: event.target.checked
                                                                }))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                        lineNumber: 295,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, server.id, true, {
                                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                lineNumber: 293,
                                                columnNumber: 19
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 288,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                lineNumber: 286,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-2 rounded-lg border border-border/70 bg-surface-2/55 p-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "wb-kicker",
                                        children: "Target Groups"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 312,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "max-h-48 space-y-1 overflow-y-auto",
                                        children: targetGroups.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                            className: "text-xs text-muted-foreground",
                                            children: "No target groups available."
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                            lineNumber: 315,
                                            columnNumber: 17
                                        }, this) : targetGroups.map((group)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                                className: "flex items-center justify-between gap-2 text-xs",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        children: [
                                                            group.name,
                                                            " (",
                                                            group.memberCount,
                                                            ")"
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                        lineNumber: 319,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("input", {
                                                        type: "checkbox",
                                                        checked: Boolean(selectedGroupIds[group.id]),
                                                        onChange: (event)=>setSelectedGroupIds((current)=>({
                                                                    ...current,
                                                                    [group.id]: event.target.checked
                                                                }))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                        lineNumber: 320,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, group.id, true, {
                                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                lineNumber: 318,
                                                columnNumber: 19
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 313,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                lineNumber: 311,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                        lineNumber: 285,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                        className: "space-y-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "wb-kicker",
                                children: "Notes"
                            }, void 0, false, {
                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                lineNumber: 338,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$textarea$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Textarea"], {
                                value: notes,
                                onChange: (event)=>setNotes(event.target.value),
                                placeholder: "Optional distribution notes"
                            }, void 0, false, {
                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                lineNumber: 339,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                        lineNumber: 337,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-xs text-muted-foreground",
                        children: [
                            "Current revision id: ",
                            selectedRuleDetailQuery.data?.currentRevision.id ?? "Select a rule to resolve revision id"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                        lineNumber: 342,
                        columnNumber: 9
                    }, this),
                    createError ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-xs text-destructive",
                        children: createError
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                        lineNumber: 346,
                        columnNumber: 24
                    }, this) : null,
                    resolvedOperatorUserId.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-xs text-amber-200",
                        children: "Provide an operator identity before creating or retrying distribution jobs."
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                        lineNumber: 347,
                        columnNumber: 48
                    }, this) : null,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center gap-2",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                            type: "button",
                            size: "sm",
                            onClick: ()=>createMutation.mutate(),
                            disabled: createMutation.isPending || resolvedOperatorUserId.length === 0,
                            children: createMutation.isPending ? "Creating..." : "Create Distribution Job"
                        }, void 0, false, {
                            fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                            lineNumber: 350,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                        lineNumber: 349,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                lineNumber: 255,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
                className: "wb-panel space-y-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                        className: "text-sm font-semibold tracking-tight",
                        children: "Job Filters"
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                        lineNumber: 357,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "grid gap-3 md:grid-cols-4",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "space-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "wb-kicker",
                                        children: "Status"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 360,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        value: statusFilter,
                                        onChange: (event)=>setStatusFilter(event.target.value),
                                        className: "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "",
                                                children: "All"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                lineNumber: 366,
                                                columnNumber: 15
                                            }, this),
                                            JOB_STATUS_FILTERS.map((status)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: status,
                                                    children: status
                                                }, status, false, {
                                                    fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                    lineNumber: 368,
                                                    columnNumber: 17
                                                }, this))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 361,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                lineNumber: 359,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "space-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "wb-kicker",
                                        children: "Operator"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 376,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                        value: operatorFilter,
                                        onChange: (event)=>setOperatorFilter(event.target.value)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 377,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                lineNumber: 375,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "space-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "wb-kicker",
                                        children: "Rule Family"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 381,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                        value: ruleFamilyFilter,
                                        onChange: (event)=>setRuleFamilyFilter(event.target.value),
                                        placeholder: "yara/sigma/snort/suricata"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 382,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                lineNumber: 380,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "space-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "wb-kicker",
                                        children: "Target Server"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 386,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        value: targetFilter,
                                        onChange: (event)=>setTargetFilter(event.target.value),
                                        className: "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "",
                                                children: "All"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                lineNumber: 392,
                                                columnNumber: 15
                                            }, this),
                                            targetServers.map((server)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: server.id,
                                                    children: server.hostname
                                                }, server.id, false, {
                                                    fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                    lineNumber: 394,
                                                    columnNumber: 17
                                                }, this))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 387,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                lineNumber: 385,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "space-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "wb-kicker",
                                        children: "Target Group"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 402,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("select", {
                                        value: groupFilter,
                                        onChange: (event)=>setGroupFilter(event.target.value),
                                        className: "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                value: "",
                                                children: "All"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                lineNumber: 408,
                                                columnNumber: 15
                                            }, this),
                                            targetGroups.map((group)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("option", {
                                                    value: group.id,
                                                    children: group.name
                                                }, group.id, false, {
                                                    fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                    lineNumber: 410,
                                                    columnNumber: 17
                                                }, this))
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 403,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                lineNumber: 401,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "space-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "wb-kicker",
                                        children: "Queued From"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 418,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                        type: "date",
                                        value: fromFilter,
                                        onChange: (event)=>setFromFilter(event.target.value)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 419,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                lineNumber: 417,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("label", {
                                className: "space-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "wb-kicker",
                                        children: "Queued To"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 423,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
                                        type: "date",
                                        value: toFilter,
                                        onChange: (event)=>setToFilter(event.target.value)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 424,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                lineNumber: 422,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                        lineNumber: 358,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                lineNumber: 356,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
                className: "wb-panel space-y-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "text-sm font-semibold tracking-tight",
                                children: "Distribution Jobs"
                            }, void 0, false, {
                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                lineNumber: 431,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                className: "text-xs text-muted-foreground",
                                children: [
                                    "Rows: ",
                                    jobs.length
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                lineNumber: 432,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                        lineNumber: 430,
                        columnNumber: 9
                    }, this),
                    jobs.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EmptyState"], {
                        title: "No distribution jobs",
                        description: "Create a distribution job to start real execution and per-target tracking."
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                        lineNumber: 436,
                        columnNumber: 11
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "overflow-x-auto rounded-xl border border-border/75 bg-surface-1/90",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Table"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableHeader"], {
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableRow"], {
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableHead"], {
                                                children: "Status"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                lineNumber: 445,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableHead"], {
                                                children: "Rule"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                lineNumber: 446,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableHead"], {
                                                children: "Operator"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                lineNumber: 447,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableHead"], {
                                                children: "Targets"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                lineNumber: 448,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableHead"], {
                                                children: "Attempts"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                lineNumber: 449,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableHead"], {
                                                children: "Queued"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                lineNumber: 450,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableHead"], {
                                                children: "Completed"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                lineNumber: 451,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 444,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                    lineNumber: 443,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableBody"], {
                                    children: jobs.map((job)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableRow"], {
                                            className: selectedJobId === job.id ? "bg-surface-2/50" : "",
                                            onClick: ()=>setSelectedJobId(job.id),
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableCell"], {
                                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$status$2d$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StatusBadge"], {
                                                        value: job.status
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                        lineNumber: 457,
                                                        columnNumber: 32
                                                    }, this)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                    lineNumber: 457,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableCell"], {
                                                    children: [
                                                        job.ruleFamily,
                                                        " r",
                                                        job.revisionNumber
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                    lineNumber: 458,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableCell"], {
                                                    children: job.operatorUserId
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                    lineNumber: 459,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableCell"], {
                                                    children: [
                                                        job.successfulTargets,
                                                        "/",
                                                        job.totalTargets
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                    lineNumber: 460,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableCell"], {
                                                    children: [
                                                        job.attemptCount,
                                                        "/",
                                                        job.maxAttempts
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                    lineNumber: 461,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableCell"], {
                                                    children: formatTime(job.queuedAtUtc)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                    lineNumber: 462,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$table$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TableCell"], {
                                                    children: formatTime(job.completedAtUtc)
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                    lineNumber: 463,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, job.id, true, {
                                            fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                            lineNumber: 456,
                                            columnNumber: 19
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                    lineNumber: 454,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                            lineNumber: 442,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                        lineNumber: 441,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                lineNumber: 429,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("article", {
                className: "wb-panel space-y-3",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "flex items-center justify-between",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("h3", {
                                className: "text-sm font-semibold tracking-tight",
                                children: "Job Drill-Down"
                            }, void 0, false, {
                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                lineNumber: 474,
                                columnNumber: 11
                            }, this),
                            selectedJob && isRetryCandidate(selectedJob) ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                type: "button",
                                size: "sm",
                                variant: "outline",
                                onClick: ()=>retryMutation.mutate(selectedJob.id),
                                disabled: retryMutation.isPending || resolvedOperatorUserId.length === 0,
                                children: retryMutation.isPending ? "Retrying..." : "Retry Unresolved Targets"
                            }, void 0, false, {
                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                lineNumber: 476,
                                columnNumber: 13
                            }, this) : null
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                        lineNumber: 473,
                        columnNumber: 9
                    }, this),
                    !selectedJobId ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["EmptyState"], {
                        title: "No job selected",
                        description: "Select a job row to inspect attempts and per-target outcomes."
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                        lineNumber: 489,
                        columnNumber: 11
                    }, this) : selectedJobAttemptsQuery.isLoading || selectedJobTargetsQuery.isLoading ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LoadingState"], {
                        label: "Loading job detail"
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                        lineNumber: 491,
                        columnNumber: 11
                    }, this) : selectedJobAttemptsQuery.isError ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$error$2d$fallback$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ClassifiedFailureState"], {
                        failure: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2d$classification$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["classifyUiError"])(selectedJobAttemptsQuery.error),
                        fallbackTitle: "Job detail unavailable"
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                        lineNumber: 493,
                        columnNumber: 11
                    }, this) : selectedJobTargetsQuery.isError ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$error$2d$fallback$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ClassifiedFailureState"], {
                        failure: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2d$classification$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["classifyUiError"])(selectedJobTargetsQuery.error),
                        fallbackTitle: "Job detail unavailable"
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                        lineNumber: 495,
                        columnNumber: 11
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "grid gap-2 md:grid-cols-5",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "rounded-lg border border-border/70 bg-surface-2/65 p-2 text-xs",
                                        children: [
                                            "Success: ",
                                            selectedJob?.successfulTargets ?? 0
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 499,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "rounded-lg border border-border/70 bg-surface-2/65 p-2 text-xs",
                                        children: [
                                            "Failure: ",
                                            selectedJob?.failedTargets ?? 0
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 500,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "rounded-lg border border-border/70 bg-surface-2/65 p-2 text-xs",
                                        children: [
                                            "Unreachable: ",
                                            selectedJob?.unreachableTargets ?? 0
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 501,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "rounded-lg border border-border/70 bg-surface-2/65 p-2 text-xs",
                                        children: [
                                            "Validation Failed: ",
                                            selectedJob?.validationFailedTargets ?? 0
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 502,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "rounded-lg border border-border/70 bg-surface-2/65 p-2 text-xs",
                                        children: [
                                            "Partially Applied: ",
                                            selectedJob?.partiallyAppliedTargets ?? 0
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 503,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                lineNumber: 498,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-2 rounded-lg border border-border/70 bg-surface-2/55 p-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "wb-kicker",
                                        children: "Attempt Timeline"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 507,
                                        columnNumber: 15
                                    }, this),
                                    (selectedJobAttemptsQuery.data ?? []).length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-xs text-muted-foreground",
                                        children: "No attempts recorded."
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 509,
                                        columnNumber: 17
                                    }, this) : (selectedJobAttemptsQuery.data ?? []).map((attempt)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "rounded-md border border-border/60 bg-surface-1/85 p-2 text-xs",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "flex flex-wrap items-center gap-2",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: [
                                                                "Attempt #",
                                                                attempt.attemptNumber
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                            lineNumber: 514,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$status$2d$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StatusBadge"], {
                                                            value: attempt.status
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                            lineNumber: 515,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: [
                                                                "Started: ",
                                                                formatTime(attempt.startedAtUtc)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                            lineNumber: 516,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: [
                                                                "Completed: ",
                                                                formatTime(attempt.completedAtUtc)
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                            lineNumber: 517,
                                                            columnNumber: 23
                                                        }, this),
                                                        attempt.backoffSeconds !== null ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            children: [
                                                                "Backoff: ",
                                                                attempt.backoffSeconds,
                                                                "s"
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                            lineNumber: 518,
                                                            columnNumber: 58
                                                        }, this) : null
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                    lineNumber: 513,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "mt-1 text-muted-foreground",
                                                    children: attempt.summary
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                    lineNumber: 520,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, attempt.id, true, {
                                            fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                            lineNumber: 512,
                                            columnNumber: 19
                                        }, this))
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                lineNumber: 506,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-2 rounded-lg border border-border/70 bg-surface-2/55 p-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "wb-kicker",
                                        children: "Per-Target Outcomes"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 527,
                                        columnNumber: 15
                                    }, this),
                                    (selectedJobTargetsQuery.data ?? []).length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-xs text-muted-foreground",
                                        children: "No target outcomes recorded."
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 529,
                                        columnNumber: 17
                                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "space-y-2",
                                        children: (selectedJobTargetsQuery.data ?? []).map((target)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "rounded-md border border-border/60 bg-surface-1/85 p-2 text-xs",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex flex-wrap items-center justify-between gap-2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "font-semibold",
                                                                        children: [
                                                                            target.targetHostname,
                                                                            " (",
                                                                            target.targetIpAddress,
                                                                            ")"
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                                        lineNumber: 536,
                                                                        columnNumber: 27
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "text-muted-foreground",
                                                                        children: [
                                                                            "Attempts: ",
                                                                            target.attemptCount,
                                                                            " | Last Attempt: ",
                                                                            formatTime(target.lastAttemptAtUtc)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                                        lineNumber: 537,
                                                                        columnNumber: 27
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                                lineNumber: 535,
                                                                columnNumber: 25
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$status$2d$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StatusBadge"], {
                                                                value: target.status
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                                lineNumber: 539,
                                                                columnNumber: 25
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                        lineNumber: 534,
                                                        columnNumber: 23
                                                    }, this),
                                                    target.lastError ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "mt-1 text-destructive",
                                                        children: target.lastError
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                        lineNumber: 541,
                                                        columnNumber: 43
                                                    }, this) : null,
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "mt-2 space-y-1",
                                                        children: target.attempts.map((attempt)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$status$2d$badge$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["StatusBadge"], {
                                                                        value: attempt.status
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                                        lineNumber: 545,
                                                                        columnNumber: 29
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        children: [
                                                                            "Transport: ",
                                                                            attempt.transport
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                                        lineNumber: 546,
                                                                        columnNumber: 29
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        children: [
                                                                            "Completed: ",
                                                                            formatTime(attempt.completedAtUtc)
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                                        lineNumber: 547,
                                                                        columnNumber: 29
                                                                    }, this),
                                                                    attempt.diagnostic ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                        children: [
                                                                            "Detail: ",
                                                                            attempt.diagnostic
                                                                        ]
                                                                    }, void 0, true, {
                                                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                                        lineNumber: 548,
                                                                        columnNumber: 51
                                                                    }, this) : null
                                                                ]
                                                            }, attempt.id, true, {
                                                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                                lineNumber: 544,
                                                                columnNumber: 27
                                                            }, this))
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                        lineNumber: 542,
                                                        columnNumber: 23
                                                    }, this)
                                                ]
                                            }, target.id, true, {
                                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                                lineNumber: 533,
                                                columnNumber: 21
                                            }, this))
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                        lineNumber: 531,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                                lineNumber: 526,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
                lineNumber: 472,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/workbench/distribution/rule-distribution-page.tsx",
        lineNumber: 246,
        columnNumber: 5
    }, this);
}
_s(RuleDistributionPage, "CA/z2qMjqcS2xANe8T1JWDIzRb8=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$QueryClientProvider$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQueryClient"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$auth$2f$auth$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMutation"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useMutation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMutation"]
    ];
});
_c = RuleDistributionPage;
var _c;
__turbopack_context__.k.register(_c, "RuleDistributionPage");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_d2ca6131._.js.map