(globalThis.TURBOPACK || (globalThis.TURBOPACK = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/components/ui/skeleton.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Skeleton",
    ()=>Skeleton
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
;
;
function Skeleton({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "skeleton",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("animate-pulse rounded-md bg-muted", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/skeleton.tsx",
        lineNumber: 5,
        columnNumber: 5
    }, this);
}
_c = Skeleton;
;
var _c;
__turbopack_context__.k.register(_c, "Skeleton");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/shared/ui/state-panels.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CompactEmptyState",
    ()=>CompactEmptyState,
    "CompactErrorState",
    ()=>CompactErrorState,
    "CompactLoadingState",
    ()=>CompactLoadingState,
    "DependencyDownState",
    ()=>DependencyDownState,
    "EmptyState",
    ()=>EmptyState,
    "ErrorState",
    ()=>ErrorState,
    "FrontendPhaseLockNotice",
    ()=>FrontendPhaseLockNotice,
    "LoadingState",
    ()=>LoadingState,
    "PermissionRestrictedState",
    ()=>PermissionRestrictedState,
    "SearchEmptyState",
    ()=>SearchEmptyState,
    "SimulatedBadge",
    ()=>SimulatedBadge,
    "UnavailableState",
    ()=>UnavailableState
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/triangle-alert.js [app-client] (ecmascript) <export default as AlertTriangle>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileSearch$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-search.js [app-client] (ecmascript) <export default as FileSearch>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$inbox$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Inbox$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/inbox.js [app-client] (ecmascript) <export default as Inbox>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/loader-circle.js [app-client] (ecmascript) <export default as Loader2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/lock.js [app-client] (ecmascript) <export default as Lock>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$server$2d$crash$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ServerCrash$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/server-crash.js [app-client] (ecmascript) <export default as ServerCrash>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wrench$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Wrench$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/wrench.js [app-client] (ecmascript) <export default as Wrench>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/skeleton.tsx [app-client] (ecmascript)");
;
;
;
function LoadingState({ label = "Loading", description }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "wb-panel flex min-h-56 flex-col justify-center gap-3",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "flex items-center gap-2 text-sm text-muted-foreground",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                        className: "h-4.5 w-4.5 animate-spin"
                    }, void 0, false, {
                        fileName: "[project]/src/shared/ui/state-panels.tsx",
                        lineNumber: 15,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        children: [
                            label,
                            "..."
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/shared/ui/state-panels.tsx",
                        lineNumber: 16,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 14,
                columnNumber: 7
            }, this),
            description ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "wb-subtle",
                children: description
            }, void 0, false, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 18,
                columnNumber: 22
            }, this) : null,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-2",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                        className: "h-8 w-full rounded-lg bg-surface-2"
                    }, void 0, false, {
                        fileName: "[project]/src/shared/ui/state-panels.tsx",
                        lineNumber: 20,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                        className: "h-8 w-11/12 rounded-lg bg-surface-2"
                    }, void 0, false, {
                        fileName: "[project]/src/shared/ui/state-panels.tsx",
                        lineNumber: 21,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$skeleton$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Skeleton"], {
                        className: "h-8 w-3/4 rounded-lg bg-surface-2"
                    }, void 0, false, {
                        fileName: "[project]/src/shared/ui/state-panels.tsx",
                        lineNumber: 22,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 19,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/shared/ui/state-panels.tsx",
        lineNumber: 13,
        columnNumber: 5
    }, this);
}
_c = LoadingState;
function EmptyState({ title, description }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "wb-panel-muted flex min-h-52 flex-col items-center justify-center gap-2 border-dashed px-6 text-center",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid h-8 w-8 place-items-center rounded-full border border-border/70 bg-surface-1/80",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$inbox$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Inbox$3e$__["Inbox"], {
                    className: "h-4 w-4 text-muted-foreground"
                }, void 0, false, {
                    fileName: "[project]/src/shared/ui/state-panels.tsx",
                    lineNumber: 32,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 31,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-sm font-semibold tracking-tight",
                children: title
            }, void 0, false, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 34,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "max-w-md text-sm text-muted-foreground",
                children: description
            }, void 0, false, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 35,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/shared/ui/state-panels.tsx",
        lineNumber: 30,
        columnNumber: 5
    }, this);
}
_c1 = EmptyState;
function SearchEmptyState({ title, description, action }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "wb-panel-muted flex min-h-56 flex-col items-center justify-center gap-3 border-dashed px-6 text-center",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid h-10 w-10 place-items-center rounded-full border border-border/70 bg-surface-1/85 shadow-[0_12px_32px_rgba(0,0,0,0.18)]",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileSearch$3e$__["FileSearch"], {
                    className: "h-4.5 w-4.5 text-muted-foreground"
                }, void 0, false, {
                    fileName: "[project]/src/shared/ui/state-panels.tsx",
                    lineNumber: 52,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 51,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "space-y-1",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm font-semibold tracking-tight",
                        children: title
                    }, void 0, false, {
                        fileName: "[project]/src/shared/ui/state-panels.tsx",
                        lineNumber: 55,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "max-w-lg text-sm text-muted-foreground",
                        children: description
                    }, void 0, false, {
                        fileName: "[project]/src/shared/ui/state-panels.tsx",
                        lineNumber: 56,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 54,
                columnNumber: 7
            }, this),
            action ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: action
            }, void 0, false, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 58,
                columnNumber: 17
            }, this) : null
        ]
    }, void 0, true, {
        fileName: "[project]/src/shared/ui/state-panels.tsx",
        lineNumber: 50,
        columnNumber: 5
    }, this);
}
_c2 = SearchEmptyState;
function ErrorState({ title, description }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "wb-panel min-h-52 border-destructive/35 bg-destructive/10 px-6 text-center",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mx-auto grid h-8 w-8 place-items-center rounded-full border border-destructive/40 bg-destructive/15",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                    className: "h-4 w-4 text-destructive"
                }, void 0, false, {
                    fileName: "[project]/src/shared/ui/state-panels.tsx",
                    lineNumber: 67,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 66,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-3 text-sm font-semibold tracking-tight",
                children: title
            }, void 0, false, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 69,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-1 text-sm text-muted-foreground",
                children: description
            }, void 0, false, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 70,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/shared/ui/state-panels.tsx",
        lineNumber: 65,
        columnNumber: 5
    }, this);
}
_c3 = ErrorState;
function UnavailableState({ title, description }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "wb-panel min-h-52 border-border/65 bg-surface-2/50 px-6 text-center",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mx-auto grid h-8 w-8 place-items-center rounded-full border border-border/70 bg-surface-1/85",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$wrench$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Wrench$3e$__["Wrench"], {
                    className: "h-4 w-4 text-muted-foreground"
                }, void 0, false, {
                    fileName: "[project]/src/shared/ui/state-panels.tsx",
                    lineNumber: 79,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 78,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-3 text-sm font-semibold tracking-tight",
                children: title
            }, void 0, false, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 81,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-1 text-sm text-muted-foreground",
                children: description
            }, void 0, false, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 82,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/shared/ui/state-panels.tsx",
        lineNumber: 77,
        columnNumber: 5
    }, this);
}
_c4 = UnavailableState;
function DependencyDownState({ title = "Dependency down", description = "A required backend dependency is unavailable for this workflow." }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "wb-panel min-h-52 border-amber-300/35 bg-amber-500/10 px-6 text-center",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mx-auto grid h-8 w-8 place-items-center rounded-full border border-amber-300/35 bg-amber-500/15",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$server$2d$crash$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ServerCrash$3e$__["ServerCrash"], {
                    className: "h-4 w-4 text-amber-200"
                }, void 0, false, {
                    fileName: "[project]/src/shared/ui/state-panels.tsx",
                    lineNumber: 97,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 96,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-3 text-sm font-semibold tracking-tight",
                children: title
            }, void 0, false, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 99,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-1 text-sm text-amber-100/90",
                children: description
            }, void 0, false, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 100,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/shared/ui/state-panels.tsx",
        lineNumber: 95,
        columnNumber: 5
    }, this);
}
_c5 = DependencyDownState;
function PermissionRestrictedState({ title = "Permission restricted", description = "Your role does not have access to this surface." }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "wb-panel min-h-52 border-sky-300/35 bg-sky-500/10 px-6 text-center",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mx-auto grid h-8 w-8 place-items-center rounded-full border border-sky-300/35 bg-sky-500/15",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$lock$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Lock$3e$__["Lock"], {
                    className: "h-4 w-4 text-sky-200"
                }, void 0, false, {
                    fileName: "[project]/src/shared/ui/state-panels.tsx",
                    lineNumber: 115,
                    columnNumber: 9
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 114,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-3 text-sm font-semibold tracking-tight",
                children: title
            }, void 0, false, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 117,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-1 text-sm text-sky-100/90",
                children: description
            }, void 0, false, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 118,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/shared/ui/state-panels.tsx",
        lineNumber: 113,
        columnNumber: 5
    }, this);
}
_c6 = PermissionRestrictedState;
function CompactLoadingState({ label }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex items-center gap-1.5 rounded-md border border-border/65 bg-surface-2/65 px-2 py-1.5 text-[11px] text-muted-foreground",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$loader$2d$circle$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Loader2$3e$__["Loader2"], {
                className: "h-3.5 w-3.5 animate-spin"
            }, void 0, false, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 126,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                children: label
            }, void 0, false, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 127,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/shared/ui/state-panels.tsx",
        lineNumber: 125,
        columnNumber: 5
    }, this);
}
_c7 = CompactLoadingState;
function CompactEmptyState({ label }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "rounded-md border border-dashed border-border/70 bg-surface-2/45 px-2 py-2 text-[11px] text-muted-foreground",
        children: label
    }, void 0, false, {
        fileName: "[project]/src/shared/ui/state-panels.tsx",
        lineNumber: 134,
        columnNumber: 5
    }, this);
}
_c8 = CompactEmptyState;
function CompactErrorState({ label }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "flex items-center gap-1.5 rounded-md border border-destructive/35 bg-destructive/10 px-2 py-1.5 text-[11px] text-destructive",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$triangle$2d$alert$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__AlertTriangle$3e$__["AlertTriangle"], {
                className: "h-3.5 w-3.5"
            }, void 0, false, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 143,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                children: label
            }, void 0, false, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 144,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/shared/ui/state-panels.tsx",
        lineNumber: 142,
        columnNumber: 5
    }, this);
}
_c9 = CompactErrorState;
function SimulatedBadge() {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: "inline-flex items-center rounded-full border border-amber-300/30 bg-amber-400/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-amber-200",
        children: "Design / Demo Mode"
    }, void 0, false, {
        fileName: "[project]/src/shared/ui/state-panels.tsx",
        lineNumber: 151,
        columnNumber: 5
    }, this);
}
_c10 = SimulatedBadge;
function FrontendPhaseLockNotice({ label = "Frontend-only phase lock", description = "Mutation actions are disabled in normal mode for this phase. Use design/demo mode only for isolated UX review." }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "rounded-lg border border-amber-300/35 bg-amber-400/10 px-3 py-2 text-xs text-amber-100",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "font-semibold tracking-tight",
                children: label
            }, void 0, false, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 166,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "mt-1",
                children: description
            }, void 0, false, {
                fileName: "[project]/src/shared/ui/state-panels.tsx",
                lineNumber: 167,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/shared/ui/state-panels.tsx",
        lineNumber: 165,
        columnNumber: 5
    }, this);
}
_c11 = FrontendPhaseLockNotice;
var _c, _c1, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9, _c10, _c11;
__turbopack_context__.k.register(_c, "LoadingState");
__turbopack_context__.k.register(_c1, "EmptyState");
__turbopack_context__.k.register(_c2, "SearchEmptyState");
__turbopack_context__.k.register(_c3, "ErrorState");
__turbopack_context__.k.register(_c4, "UnavailableState");
__turbopack_context__.k.register(_c5, "DependencyDownState");
__turbopack_context__.k.register(_c6, "PermissionRestrictedState");
__turbopack_context__.k.register(_c7, "CompactLoadingState");
__turbopack_context__.k.register(_c8, "CompactEmptyState");
__turbopack_context__.k.register(_c9, "CompactErrorState");
__turbopack_context__.k.register(_c10, "SimulatedBadge");
__turbopack_context__.k.register(_c11, "FrontendPhaseLockNotice");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/workbench/route-guard.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "RouteGuard",
    ()=>RouteGuard
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$auth$2f$auth$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/auth/auth-provider.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$auth$2f$session$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/auth/session.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/ui/state-panels.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature();
"use client";
;
;
;
;
;
function RouteGuard({ children, requiredRoles }) {
    _s();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const { session, loading } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$auth$2f$auth$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const hasRequiredRole = !requiredRoles || requiredRoles.length === 0 || requiredRoles.some((role)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$auth$2f$session$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["hasRole"])(session, role));
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "RouteGuard.useEffect": ()=>{
            if (loading) {
                return;
            }
            if (!session) {
                const next = encodeURIComponent(pathname);
                router.replace(`/auth?next=${next}`);
            }
        }
    }["RouteGuard.useEffect"], [
        loading,
        pathname,
        router,
        session
    ]);
    if (loading || !session) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["LoadingState"], {
            label: "Checking session"
        }, void 0, false, {
            fileName: "[project]/src/components/workbench/route-guard.tsx",
            lineNumber: 35,
            columnNumber: 12
        }, this);
    }
    if (!hasRequiredRole) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PermissionRestrictedState"], {
            title: "Permission restricted",
            description: "Your role cannot access this route."
        }, void 0, false, {
            fileName: "[project]/src/components/workbench/route-guard.tsx",
            lineNumber: 40,
            columnNumber: 7
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
        children: children
    }, void 0, false);
}
_s(RouteGuard, "A9lCdrOJF3JT8rKRhITFADOz+mc=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$auth$2f$auth$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"]
    ];
});
_c = RouteGuard;
var _c;
__turbopack_context__.k.register(_c, "RouteGuard");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/dialog.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Dialog",
    ()=>Dialog,
    "DialogClose",
    ()=>DialogClose,
    "DialogContent",
    ()=>DialogContent,
    "DialogDescription",
    ()=>DialogDescription,
    "DialogFooter",
    ()=>DialogFooter,
    "DialogHeader",
    ()=>DialogHeader,
    "DialogOverlay",
    ()=>DialogOverlay,
    "DialogPortal",
    ()=>DialogPortal,
    "DialogTitle",
    ()=>DialogTitle,
    "DialogTrigger",
    ()=>DialogTrigger
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$dialog$2f$index$2e$parts$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__ = __turbopack_context__.i("[project]/node_modules/@base-ui/react/esm/dialog/index.parts.js [app-client] (ecmascript) <export * as Dialog>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/x.js [app-client] (ecmascript) <export default as XIcon>");
"use client";
;
;
;
;
;
function Dialog({ ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$dialog$2f$index$2e$parts$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Root, {
        "data-slot": "dialog",
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/dialog.tsx",
        lineNumber: 11,
        columnNumber: 10
    }, this);
}
_c = Dialog;
function DialogTrigger({ ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$dialog$2f$index$2e$parts$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Trigger, {
        "data-slot": "dialog-trigger",
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/dialog.tsx",
        lineNumber: 15,
        columnNumber: 10
    }, this);
}
_c1 = DialogTrigger;
function DialogPortal({ ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$dialog$2f$index$2e$parts$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Portal, {
        "data-slot": "dialog-portal",
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/dialog.tsx",
        lineNumber: 19,
        columnNumber: 10
    }, this);
}
_c2 = DialogPortal;
function DialogClose({ ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$dialog$2f$index$2e$parts$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Close, {
        "data-slot": "dialog-close",
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/dialog.tsx",
        lineNumber: 23,
        columnNumber: 10
    }, this);
}
_c3 = DialogClose;
function DialogOverlay({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$dialog$2f$index$2e$parts$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Backdrop, {
        "data-slot": "dialog-overlay",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/dialog.tsx",
        lineNumber: 31,
        columnNumber: 5
    }, this);
}
_c4 = DialogOverlay;
function DialogContent({ className, children, showCloseButton = true, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DialogPortal, {
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DialogOverlay, {}, void 0, false, {
                fileName: "[project]/src/components/ui/dialog.tsx",
                lineNumber: 52,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$dialog$2f$index$2e$parts$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Popup, {
                "data-slot": "dialog-content",
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-background p-4 text-sm ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", className),
                ...props,
                children: [
                    children,
                    showCloseButton && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$dialog$2f$index$2e$parts$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Close, {
                        "data-slot": "dialog-close",
                        render: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                            variant: "ghost",
                            className: "absolute top-2 right-2",
                            size: "icon-sm"
                        }, void 0, false, {
                            fileName: "[project]/src/components/ui/dialog.tsx",
                            lineNumber: 66,
                            columnNumber: 15
                        }, void 0),
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$x$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__XIcon$3e$__["XIcon"], {}, void 0, false, {
                                fileName: "[project]/src/components/ui/dialog.tsx",
                                lineNumber: 73,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "sr-only",
                                children: "Close"
                            }, void 0, false, {
                                fileName: "[project]/src/components/ui/dialog.tsx",
                                lineNumber: 75,
                                columnNumber: 13
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/ui/dialog.tsx",
                        lineNumber: 63,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/dialog.tsx",
                lineNumber: 53,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/dialog.tsx",
        lineNumber: 51,
        columnNumber: 5
    }, this);
}
_c5 = DialogContent;
function DialogHeader({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "dialog-header",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex flex-col gap-2", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/dialog.tsx",
        lineNumber: 85,
        columnNumber: 5
    }, this);
}
_c6 = DialogHeader;
function DialogFooter({ className, showCloseButton = false, children, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "dialog-footer",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end", className),
        ...props,
        children: [
            children,
            showCloseButton && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$dialog$2f$index$2e$parts$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Close, {
                render: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                    variant: "outline"
                }, void 0, false, {
                    fileName: "[project]/src/components/ui/dialog.tsx",
                    lineNumber: 112,
                    columnNumber: 40
                }, void 0),
                children: "Close"
            }, void 0, false, {
                fileName: "[project]/src/components/ui/dialog.tsx",
                lineNumber: 112,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/dialog.tsx",
        lineNumber: 102,
        columnNumber: 5
    }, this);
}
_c7 = DialogFooter;
function DialogTitle({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$dialog$2f$index$2e$parts$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Title, {
        "data-slot": "dialog-title",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-base leading-none font-medium", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/dialog.tsx",
        lineNumber: 122,
        columnNumber: 5
    }, this);
}
_c8 = DialogTitle;
function DialogDescription({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$dialog$2f$index$2e$parts$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__Dialog$3e$__["Dialog"].Description, {
        "data-slot": "dialog-description",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/dialog.tsx",
        lineNumber: 135,
        columnNumber: 5
    }, this);
}
_c9 = DialogDescription;
;
var _c, _c1, _c2, _c3, _c4, _c5, _c6, _c7, _c8, _c9;
__turbopack_context__.k.register(_c, "Dialog");
__turbopack_context__.k.register(_c1, "DialogTrigger");
__turbopack_context__.k.register(_c2, "DialogPortal");
__turbopack_context__.k.register(_c3, "DialogClose");
__turbopack_context__.k.register(_c4, "DialogOverlay");
__turbopack_context__.k.register(_c5, "DialogContent");
__turbopack_context__.k.register(_c6, "DialogHeader");
__turbopack_context__.k.register(_c7, "DialogFooter");
__turbopack_context__.k.register(_c8, "DialogTitle");
__turbopack_context__.k.register(_c9, "DialogDescription");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/input.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Input",
    ()=>Input
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$input$2f$Input$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@base-ui/react/esm/input/Input.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
;
;
;
function Input({ className, type, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$input$2f$Input$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
        type: type,
        "data-slot": "input",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/input.tsx",
        lineNumber: 8,
        columnNumber: 5
    }, this);
}
_c = Input;
;
var _c;
__turbopack_context__.k.register(_c, "Input");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/textarea.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Textarea",
    ()=>Textarea
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
;
;
function Textarea({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("textarea", {
        "data-slot": "textarea",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/textarea.tsx",
        lineNumber: 7,
        columnNumber: 5
    }, this);
}
_c = Textarea;
;
var _c;
__turbopack_context__.k.register(_c, "Textarea");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/input-group.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "InputGroup",
    ()=>InputGroup,
    "InputGroupAddon",
    ()=>InputGroupAddon,
    "InputGroupButton",
    ()=>InputGroupButton,
    "InputGroupInput",
    ()=>InputGroupInput,
    "InputGroupText",
    ()=>InputGroupText,
    "InputGroupTextarea",
    ()=>InputGroupTextarea
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/class-variance-authority/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/input.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$textarea$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/textarea.tsx [app-client] (ecmascript)");
"use client";
;
;
;
;
;
;
function InputGroup({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "input-group",
        role: "group",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("group/input-group relative flex h-8 w-full min-w-0 items-center rounded-lg border border-input transition-colors outline-none in-data-[slot=combobox-content]:focus-within:border-inherit in-data-[slot=combobox-content]:focus-within:ring-0 has-disabled:bg-input/50 has-disabled:opacity-50 has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-3 has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50 has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-3 has-[[data-slot][aria-invalid=true]]:ring-destructive/20 has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>textarea]:h-auto dark:bg-input/30 dark:has-disabled:bg-input/80 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40 has-[>[data-align=block-end]]:[&>input]:pt-3 has-[>[data-align=block-start]]:[&>input]:pb-3 has-[>[data-align=inline-end]]:[&>input]:pr-1.5 has-[>[data-align=inline-start]]:[&>input]:pl-1.5", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/input-group.tsx",
        lineNumber: 13,
        columnNumber: 5
    }, this);
}
_c = InputGroup;
const inputGroupAddonVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])("flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4", {
    variants: {
        align: {
            "inline-start": "order-first pl-2 has-[>button]:ml-[-0.3rem] has-[>kbd]:ml-[-0.15rem]",
            "inline-end": "order-last pr-2 has-[>button]:mr-[-0.3rem] has-[>kbd]:mr-[-0.15rem]",
            "block-start": "order-first w-full justify-start px-2.5 pt-2 group-has-[>input]/input-group:pt-2 [.border-b]:pb-2",
            "block-end": "order-last w-full justify-start px-2.5 pb-2 group-has-[>input]/input-group:pb-2 [.border-t]:pt-2"
        }
    },
    defaultVariants: {
        align: "inline-start"
    }
});
function InputGroupAddon({ className, align = "inline-start", ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        role: "group",
        "data-slot": "input-group-addon",
        "data-align": align,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(inputGroupAddonVariants({
            align
        }), className),
        onClick: (e)=>{
            if (e.target.closest("button")) {
                return;
            }
            e.currentTarget.parentElement?.querySelector("input")?.focus();
        },
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/input-group.tsx",
        lineNumber: 52,
        columnNumber: 5
    }, this);
}
_c1 = InputGroupAddon;
const inputGroupButtonVariants = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$class$2d$variance$2d$authority$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cva"])("flex items-center gap-2 text-sm shadow-none", {
    variants: {
        size: {
            xs: "h-6 gap-1 rounded-[calc(var(--radius)-3px)] px-1.5 [&>svg:not([class*='size-'])]:size-3.5",
            sm: "",
            "icon-xs": "size-6 rounded-[calc(var(--radius)-3px)] p-0 has-[>svg]:p-0",
            "icon-sm": "size-8 p-0 has-[>svg]:p-0"
        }
    },
    defaultVariants: {
        size: "xs"
    }
});
function InputGroupButton({ className, type = "button", variant = "ghost", size = "xs", ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
        type: type,
        "data-size": size,
        variant: variant,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])(inputGroupButtonVariants({
            size
        }), className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/input-group.tsx",
        lineNumber: 97,
        columnNumber: 5
    }, this);
}
_c2 = InputGroupButton;
function InputGroupText({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/input-group.tsx",
        lineNumber: 109,
        columnNumber: 5
    }, this);
}
_c3 = InputGroupText;
function InputGroupInput({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Input"], {
        "data-slot": "input-group-control",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex-1 rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/input-group.tsx",
        lineNumber: 124,
        columnNumber: 5
    }, this);
}
_c4 = InputGroupInput;
function InputGroupTextarea({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$textarea$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Textarea"], {
        "data-slot": "input-group-control",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex-1 resize-none rounded-none border-0 bg-transparent py-2 shadow-none ring-0 focus-visible:ring-0 disabled:bg-transparent aria-invalid:ring-0 dark:bg-transparent dark:disabled:bg-transparent", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/input-group.tsx",
        lineNumber: 140,
        columnNumber: 5
    }, this);
}
_c5 = InputGroupTextarea;
;
var _c, _c1, _c2, _c3, _c4, _c5;
__turbopack_context__.k.register(_c, "InputGroup");
__turbopack_context__.k.register(_c1, "InputGroupAddon");
__turbopack_context__.k.register(_c2, "InputGroupButton");
__turbopack_context__.k.register(_c3, "InputGroupText");
__turbopack_context__.k.register(_c4, "InputGroupInput");
__turbopack_context__.k.register(_c5, "InputGroupTextarea");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/command.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Command",
    ()=>Command,
    "CommandDialog",
    ()=>CommandDialog,
    "CommandEmpty",
    ()=>CommandEmpty,
    "CommandGroup",
    ()=>CommandGroup,
    "CommandInput",
    ()=>CommandInput,
    "CommandItem",
    ()=>CommandItem,
    "CommandList",
    ()=>CommandList,
    "CommandSeparator",
    ()=>CommandSeparator,
    "CommandShortcut",
    ()=>CommandShortcut
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$cmdk$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/cmdk/dist/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/dialog.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2d$group$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/input-group.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__SearchIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/search.js [app-client] (ecmascript) <export default as SearchIcon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckIcon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/check.js [app-client] (ecmascript) <export default as CheckIcon>");
"use client";
;
;
;
;
;
;
function Command({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$cmdk$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Command"], {
        "data-slot": "command",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex size-full flex-col overflow-hidden rounded-xl! border border-border/70 bg-popover p-1 text-popover-foreground", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/command.tsx",
        lineNumber: 25,
        columnNumber: 5
    }, this);
}
_c = Command;
function CommandDialog({ title = "Command Palette", description = "Search for a command to run...", children, className, showCloseButton = false, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Dialog"], {
        ...props,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogHeader"], {
                className: "sr-only",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogTitle"], {
                        children: title
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/command.tsx",
                        lineNumber: 53,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogDescription"], {
                        children: description
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/command.tsx",
                        lineNumber: 54,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/ui/command.tsx",
                lineNumber: 52,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$dialog$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["DialogContent"], {
                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("top-[22%] w-full max-w-2xl translate-y-0 overflow-hidden rounded-xl! p-0", className),
                showCloseButton: showCloseButton,
                children: children
            }, void 0, false, {
                fileName: "[project]/src/components/ui/command.tsx",
                lineNumber: 56,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/command.tsx",
        lineNumber: 51,
        columnNumber: 5
    }, this);
}
_c1 = CommandDialog;
function CommandInput({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        "data-slot": "command-input-wrapper",
        className: "p-2 pb-1",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2d$group$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["InputGroup"], {
            className: "h-9! rounded-lg! border-input/40 bg-input/35 shadow-none! *:data-[slot=input-group-addon]:pl-2!",
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$cmdk$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Command"].Input, {
                    "data-slot": "command-input",
                    className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("w-full text-sm outline-hidden placeholder:text-muted-foreground/80 disabled:cursor-not-allowed disabled:opacity-50", className),
                    ...props
                }, void 0, false, {
                    fileName: "[project]/src/components/ui/command.tsx",
                    lineNumber: 76,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$input$2d$group$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["InputGroupAddon"], {
                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__SearchIcon$3e$__["SearchIcon"], {
                        className: "size-4 shrink-0 opacity-50"
                    }, void 0, false, {
                        fileName: "[project]/src/components/ui/command.tsx",
                        lineNumber: 85,
                        columnNumber: 11
                    }, this)
                }, void 0, false, {
                    fileName: "[project]/src/components/ui/command.tsx",
                    lineNumber: 84,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/ui/command.tsx",
            lineNumber: 75,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/ui/command.tsx",
        lineNumber: 74,
        columnNumber: 5
    }, this);
}
_c2 = CommandInput;
function CommandList({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$cmdk$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Command"].List, {
        "data-slot": "command-list",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("no-scrollbar max-h-96 scroll-py-1 overflow-x-hidden overflow-y-auto outline-none", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/command.tsx",
        lineNumber: 97,
        columnNumber: 5
    }, this);
}
_c3 = CommandList;
function CommandEmpty({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$cmdk$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Command"].Empty, {
        "data-slot": "command-empty",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("py-6 text-center text-sm", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/command.tsx",
        lineNumber: 113,
        columnNumber: 5
    }, this);
}
_c4 = CommandEmpty;
function CommandGroup({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$cmdk$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Command"].Group, {
        "data-slot": "command-group",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("overflow-hidden p-1 text-foreground **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-[10px] **:[[cmdk-group-heading]]:font-semibold **:[[cmdk-group-heading]]:uppercase **:[[cmdk-group-heading]]:tracking-[0.12em] **:[[cmdk-group-heading]]:text-muted-foreground", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/command.tsx",
        lineNumber: 126,
        columnNumber: 5
    }, this);
}
_c5 = CommandGroup;
function CommandSeparator({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$cmdk$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Command"].Separator, {
        "data-slot": "command-separator",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("-mx-1 h-px bg-border", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/command.tsx",
        lineNumber: 142,
        columnNumber: 5
    }, this);
}
_c6 = CommandSeparator;
function CommandItem({ className, children, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$cmdk$2f$dist$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Command"].Item, {
        "data-slot": "command-item",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("group/command-item relative flex min-h-10 cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none in-data-[slot=dialog-content]:rounded-lg! data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-selected:bg-muted data-selected:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-selected:*:[svg]:text-foreground", className),
        ...props,
        children: [
            children,
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$check$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__CheckIcon$3e$__["CheckIcon"], {
                className: "ml-auto opacity-0 group-has-data-[slot=command-shortcut]/command-item:hidden group-data-[checked=true]/command-item:opacity-100"
            }, void 0, false, {
                fileName: "[project]/src/components/ui/command.tsx",
                lineNumber: 165,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/command.tsx",
        lineNumber: 156,
        columnNumber: 5
    }, this);
}
_c7 = CommandItem;
function CommandShortcut({ className, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
        "data-slot": "command-shortcut",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("ml-auto text-xs tracking-widest text-muted-foreground group-data-selected/command-item:text-foreground", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/command.tsx",
        lineNumber: 175,
        columnNumber: 5
    }, this);
}
_c8 = CommandShortcut;
;
var _c, _c1, _c2, _c3, _c4, _c5, _c6, _c7, _c8;
__turbopack_context__.k.register(_c, "Command");
__turbopack_context__.k.register(_c1, "CommandDialog");
__turbopack_context__.k.register(_c2, "CommandInput");
__turbopack_context__.k.register(_c3, "CommandList");
__turbopack_context__.k.register(_c4, "CommandEmpty");
__turbopack_context__.k.register(_c5, "CommandGroup");
__turbopack_context__.k.register(_c6, "CommandSeparator");
__turbopack_context__.k.register(_c7, "CommandItem");
__turbopack_context__.k.register(_c8, "CommandShortcut");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/workbench/workbench-route-meta.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "WORKBENCH_CASE_ROUTES",
    ()=>WORKBENCH_CASE_ROUTES,
    "WORKBENCH_MODULE_ORDER",
    ()=>WORKBENCH_MODULE_ORDER,
    "WORKBENCH_ROUTES",
    ()=>WORKBENCH_ROUTES,
    "getWorkbenchNavByModule",
    ()=>getWorkbenchNavByModule,
    "isWorkbenchNavActive",
    ()=>isWorkbenchNavActive,
    "resolveWorkbenchRoute",
    ()=>resolveWorkbenchRoute
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/activity.js [app-client] (ecmascript) <export default as Activity>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2d$3$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock3$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/clock-3.js [app-client] (ecmascript) <export default as Clock3>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileSearch$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-search.js [app-client] (ecmascript) <export default as FileSearch>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/file-text.js [app-client] (ecmascript) <export default as FileText>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$checks$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ListChecks$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/list-checks.js [app-client] (ecmascript) <export default as ListChecks>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$radar$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Radar$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/radar.js [app-client] (ecmascript) <export default as Radar>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2d$code$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__SearchCode$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/search-code.js [app-client] (ecmascript) <export default as SearchCode>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$server$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Server$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/server.js [app-client] (ecmascript) <export default as Server>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/settings.js [app-client] (ecmascript) <export default as Settings>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$share$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Share2$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/share-2.js [app-client] (ecmascript) <export default as Share2>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$workflow$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Workflow$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/workflow.js [app-client] (ecmascript) <export default as Workflow>");
;
const WORKBENCH_MODULE_ORDER = [
    "Core",
    "Operations",
    "Settings"
];
const WORKBENCH_ROUTES = [
    {
        id: "overview",
        href: "/overview",
        aliases: [
            "/"
        ],
        module: "Core",
        label: "Dashboard",
        title: "Dashboard",
        subtitle: "Operational posture across ingestion, scans, alerts, and rule lifecycle activity.",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$radar$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Radar$3e$__["Radar"],
        commandAliases: [
            "Dashboard",
            "Overview",
            "Operations Overview"
        ]
    },
    {
        id: "queue",
        href: "/queue",
        aliases: [
            "/problematic-queue"
        ],
        module: "Core",
        label: "Alert Queue",
        title: "Alert Queue",
        subtitle: "Priority-ordered alert queue for analyst triage and approval flow.",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$list$2d$checks$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__ListChecks$3e$__["ListChecks"],
        commandAliases: [
            "Alert Queue",
            "Queue",
            "Triage Queue"
        ]
    },
    {
        id: "alerts",
        href: "/alerts",
        aliases: [
            "/cases",
            "/matches",
            "/investigations",
            "/graph-relationships"
        ],
        module: "Core",
        label: "Alerts",
        title: "Alert Registry",
        subtitle: "Alert registry with current status, priority, and deployment context.",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__["Activity"],
        commandAliases: [
            "Alerts",
            "Alert Registry"
        ]
    },
    {
        id: "rules",
        href: "/rules",
        aliases: [
            "/detection-studio",
            "/rules-studio"
        ],
        module: "Operations",
        label: "Rules Management",
        title: "Rules Management",
        subtitle: "YARA, Sigma, Snort, and Suricata rule authoring, review, simulation, and release controls.",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2d$code$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__SearchCode$3e$__["SearchCode"],
        commandAliases: [
            "Rules Management",
            "Rule Repository",
            "Rules",
            "Rule Management"
        ]
    },
    {
        id: "servers",
        href: "/servers",
        aliases: [
            "/operations"
        ],
        module: "Operations",
        label: "Targets / Servers",
        title: "Targets / Servers",
        subtitle: "Server discovery, health, scanner coverage, and operational management.",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$server$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Server$3e$__["Server"],
        commandAliases: [
            "Targets / Servers",
            "Servers",
            "Server Management",
            "Server Discovery"
        ]
    },
    {
        id: "distribution",
        href: "/distribution",
        aliases: [
            "/deployments"
        ],
        module: "Operations",
        label: "Rule Distribution",
        title: "Rule Distribution",
        subtitle: "Controlled distribution and staged promotion of approved detection rules.",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$share$2d$2$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Share2$3e$__["Share2"],
        commandAliases: [
            "Rule Distribution",
            "Distribution",
            "Deployments"
        ]
    },
    {
        id: "ioc-ingestion",
        href: "/ioc-ingestion",
        aliases: [
            "/ingestion-feeds",
            "/threat-intel"
        ],
        module: "Operations",
        label: "IOCs Explorer",
        title: "IOCs Explorer",
        subtitle: "Explore normalized IoC data, feed quality, and source-level processing state.",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileSearch$3e$__["FileSearch"],
        commandAliases: [
            "IOCs Explorer",
            "IoC Ingestion",
            "Ingestion",
            "Feeds"
        ]
    },
    {
        id: "results-ingestion",
        href: "/results-ingestion",
        aliases: [
            "/reports-ingestion"
        ],
        module: "Operations",
        label: "Scans",
        title: "Scans",
        subtitle: "Search scan results, detection history, and execution outcomes with backend filters.",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$workflow$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Workflow$3e$__["Workflow"],
        commandAliases: [
            "Scans",
            "Result Ingestion",
            "Normalized Result Ingestion"
        ]
    },
    {
        id: "scan-plan",
        href: "/scan-plan",
        aliases: [
            "/servers/scan-plans",
            "/operations/scan-plans"
        ],
        module: "Operations",
        label: "Scan Plan",
        title: "Scan Plan",
        subtitle: "Reusable scan configurations with cadence, rule selection, run-now execution, and last-run posture.",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2d$3$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock3$3e$__["Clock3"],
        commandAliases: [
            "Scan Plan",
            "Scan Plans",
            "Plan Scheduler",
            "Scheduled Scans"
        ]
    },
    {
        id: "reporting",
        href: "/reporting",
        aliases: [
            "/reports",
            "/ioc-registry",
            "/coverage",
            "/coverage-pain-analysis"
        ],
        module: "Operations",
        label: "Reports",
        title: "Reports",
        subtitle: "Operational reporting, visual analytics, audit views, and result-driven summaries.",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$file$2d$text$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__FileText$3e$__["FileText"],
        commandAliases: [
            "Reports",
            "Reporting",
            "Audit Reports"
        ]
    },
    {
        id: "settings",
        href: "/settings",
        aliases: [
            "/admin",
            "/settings-admin"
        ],
        module: "Settings",
        label: "Settings",
        title: "Settings",
        subtitle: "Environment health, retention controls, and role-gated administrative settings.",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$settings$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Settings$3e$__["Settings"],
        commandAliases: [
            "Settings",
            "Administration"
        ]
    }
];
const WORKBENCH_CASE_ROUTES = [
    {
        id: "alert-detail",
        suffix: "",
        label: "Alert Detail",
        title: "Alert Detail",
        subtitle: "Alert summary with decisions, evidence, and rollout posture.",
        icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$activity$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Activity$3e$__["Activity"],
        commandAliases: [
            "Alert Detail"
        ]
    }
];
const ROUTE_BY_HREF = new Map(WORKBENCH_ROUTES.map((item)=>[
        item.href,
        item
    ]));
const ALIAS_TO_CANONICAL = new Map(WORKBENCH_ROUTES.flatMap((item)=>item.aliases.map((alias)=>[
            alias,
            item.href
        ])));
const RULES_SUBROUTE_BY_SUFFIX = new Map([
    [
        "",
        {
            label: "Rule Catalog",
            title: "Rules Management",
            subtitle: "Central rule repository with review and release stages."
        }
    ],
    [
        "review",
        {
            label: "Rule Review",
            title: "Rule Review",
            subtitle: "Reviewer queue, validation notes, and approval outcomes."
        }
    ],
    [
        "simulation",
        {
            label: "Rule Simulation",
            title: "Rule Simulation",
            subtitle: "Dry-run and quality simulation before controlled rollout."
        }
    ],
    [
        "canary-rollouts",
        {
            label: "Canary Rollouts",
            title: "Canary Rollouts",
            subtitle: "Staged deployment progression with explicit safety controls."
        }
    ],
    [
        "rollback-history",
        {
            label: "Rollback History",
            title: "Rollback History",
            subtitle: "Historical rollback actions and remediation traceability."
        }
    ]
]);
const INGESTION_SUBROUTE_BY_SUFFIX = new Map([
    [
        "",
        {
            label: "Ingestion Overview",
            title: "IOCs Explorer",
            subtitle: "Explore ingestion health and normalization readiness for IoC sources."
        }
    ],
    [
        "feed-explorer",
        {
            label: "Feed Explorer",
            title: "Feed Explorer",
            subtitle: "Source-level feed quality, dedupe posture, and processing state."
        }
    ]
]);
const SERVERS_SUBROUTE_BY_SUFFIX = new Map([
    [
        "",
        {
            label: "Server Inventory",
            title: "Targets / Servers",
            subtitle: "Server inventory, health, and scanner assignment posture."
        }
    ],
    [
        "subnets",
        {
            label: "Subnets",
            title: "Subnet Operations",
            subtitle: "Network segmentation and subnet allocation controls."
        }
    ],
    [
        "asset-groups",
        {
            label: "Asset Groups",
            title: "Asset Group Operations",
            subtitle: "Server grouping policies and operational assignment context."
        }
    ],
    [
        "scanner-fleet",
        {
            label: "Scanner Fleet",
            title: "Scanner Fleet",
            subtitle: "Scanner node health and assignment management."
        }
    ]
]);
const LEGACY_ALERT_SUBROUTES = new Set([
    "evidence-bundle",
    "graph-investigation",
    "decision-trace",
    "rule-proposals",
    "simulation-results"
]);
function normalizePath(pathname) {
    const trimmed = pathname.trim();
    if (!trimmed || trimmed === "/") {
        return "/overview";
    }
    return trimmed.length > 1 && trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
}
function parseAlertPath(pathname) {
    const match = pathname.match(/^\/(?:alerts|cases)\/([^/]+)(?:\/([^/]+))?$/);
    if (!match) {
        return null;
    }
    const caseId = match[1];
    const suffix = match[2] ?? "";
    if (!suffix) {
        return {
            caseId,
            suffix: ""
        };
    }
    if (LEGACY_ALERT_SUBROUTES.has(suffix)) {
        return {
            caseId,
            suffix
        };
    }
    return {
        caseId,
        suffix: null
    };
}
function parseRulesPath(pathname) {
    const match = pathname.match(/^\/(?:rules|detection-studio|rules-studio)(?:\/([^/]+))?$/);
    if (!match) {
        return null;
    }
    const suffix = match[1] ?? "";
    if (suffix === "feed-explorer") {
        return null;
    }
    if (!suffix) {
        return {
            kind: "catalog"
        };
    }
    if (RULES_SUBROUTE_BY_SUFFIX.has(suffix)) {
        return {
            kind: suffix === "" ? "catalog" : "legacy"
        };
    }
    return {
        kind: "detail"
    };
}
function parseIngestionPath(pathname) {
    if (pathname === "/detection-studio/feed-explorer" || pathname === "/rules-studio/feed-explorer") {
        return {
            suffix: "feed-explorer"
        };
    }
    const match = pathname.match(/^\/(?:ioc-ingestion|ingestion-feeds|threat-intel)(?:\/([^/]+))?$/);
    if (!match) {
        return null;
    }
    const suffix = match[1] ?? "";
    if (!INGESTION_SUBROUTE_BY_SUFFIX.has(suffix)) {
        return {
            suffix: null
        };
    }
    return {
        suffix
    };
}
function parseResultIngestionPath(pathname) {
    return /^\/(?:results-ingestion|reports-ingestion)(?:\/.*)?$/.test(pathname);
}
function parseScanPlanPath(pathname) {
    return /^\/(?:scan-plan|servers\/scan-plans|operations\/scan-plans)(?:\/.*)?$/.test(pathname);
}
function parseServersPath(pathname) {
    const serverMatch = pathname.match(/^\/(?:servers|operations)\/servers\/([^/]+)$/);
    if (serverMatch) {
        return {
            kind: "server",
            serverId: serverMatch[1]
        };
    }
    const subpageMatch = pathname.match(/^\/(?:servers|operations)(?:\/([^/]+))?$/);
    if (!subpageMatch) {
        return null;
    }
    const suffix = subpageMatch[1] ?? "";
    if (!SERVERS_SUBROUTE_BY_SUFFIX.has(suffix)) {
        return {
            kind: "subpage",
            suffix: null
        };
    }
    return {
        kind: "subpage",
        suffix
    };
}
function parseDistributionPath(pathname) {
    return /^\/(?:distribution|deployments)(?:\/.*)?$/.test(pathname);
}
function parseReportingPath(pathname) {
    return /^\/(?:reporting|reports|ioc-registry|coverage|coverage-pain-analysis)(?:\/.*)?$/.test(pathname);
}
function toAlertLabel(caseId) {
    return `Alert ${caseId.slice(0, 8)}`;
}
function buildRouteBreadcrumbs(route) {
    return [
        {
            label: route.module
        },
        {
            label: route.label,
            href: route.href
        }
    ];
}
function buildAlertBreadcrumbs(caseId) {
    return [
        {
            label: "Core"
        },
        {
            label: "Alerts",
            href: "/alerts"
        },
        {
            label: toAlertLabel(caseId),
            href: `/alerts/${caseId}`
        }
    ];
}
function buildRulesBreadcrumbs(subroute) {
    const breadcrumbs = [
        {
            label: "Operations"
        },
        {
            label: "Rules Management",
            href: "/rules"
        }
    ];
    if (subroute && subroute.label !== "Rule Catalog") {
        breadcrumbs.push({
            label: subroute.label
        });
    }
    return breadcrumbs;
}
function buildIngestionBreadcrumbs(subroute) {
    const breadcrumbs = [
        {
            label: "Operations"
        },
        {
            label: "IOCs Explorer",
            href: "/ioc-ingestion"
        }
    ];
    if (subroute && subroute.label !== "Ingestion Overview") {
        breadcrumbs.push({
            label: subroute.label
        });
    }
    return breadcrumbs;
}
function buildServersBreadcrumbs(subroute) {
    const breadcrumbs = [
        {
            label: "Operations"
        },
        {
            label: "Servers",
            href: "/servers"
        }
    ];
    if (subroute && subroute.label !== "Server Inventory") {
        breadcrumbs.push({
            label: subroute.label
        });
    }
    return breadcrumbs;
}
function buildServerDetailBreadcrumbs(serverId) {
    return [
        {
            label: "Operations"
        },
        {
            label: "Servers",
            href: "/servers"
        },
        {
            label: `Server ${serverId.slice(0, 11)}`
        }
    ];
}
function resolveWorkbenchRoute(pathname) {
    const normalized = normalizePath(pathname);
    const alertMatch = parseAlertPath(normalized);
    if (alertMatch) {
        return {
            pathname: normalized,
            canonicalPath: `/alerts/${alertMatch.caseId}`,
            module: "Alert",
            title: toAlertLabel(alertMatch.caseId),
            subtitle: "Alert summary with evidence, decision, and rollout posture.",
            breadcrumbs: buildAlertBreadcrumbs(alertMatch.caseId),
            route: ROUTE_BY_HREF.get("/alerts") ?? null,
            caseRoute: WORKBENCH_CASE_ROUTES[0] ?? null,
            caseId: alertMatch.caseId
        };
    }
    const rulesMatch = parseRulesPath(normalized);
    if (rulesMatch) {
        const route = ROUTE_BY_HREF.get("/rules") ?? null;
        if (rulesMatch.kind === "detail") {
            const ruleId = normalized.split("/").filter(Boolean).at(-1) ?? "rule";
            return {
                pathname: normalized,
                canonicalPath: `/rules/${ruleId}`,
                module: "Operations",
                title: `Rule Detail - ${ruleId.slice(0, 12)}`,
                subtitle: "Metadata, current content, revisions, and import diagnostics.",
                breadcrumbs: [
                    {
                        label: "Operations"
                    },
                    {
                        label: "Rules Management",
                        href: "/rules"
                    },
                    {
                        label: `Rule ${ruleId.slice(0, 12)}`
                    }
                ],
                route,
                caseRoute: null,
                caseId: null
            };
        }
        return {
            pathname: normalized,
            canonicalPath: "/rules",
            module: "Operations",
            title: route?.title ?? "Rules Management",
            subtitle: route?.subtitle ?? "Rule authoring and staged release controls.",
            breadcrumbs: buildRulesBreadcrumbs(null),
            route,
            caseRoute: null,
            caseId: null
        };
    }
    const ingestionMatch = parseIngestionPath(normalized);
    if (ingestionMatch) {
        const route = ROUTE_BY_HREF.get("/ioc-ingestion") ?? null;
        const subroute = ingestionMatch.suffix === null ? null : INGESTION_SUBROUTE_BY_SUFFIX.get(ingestionMatch.suffix) ?? null;
        const canonicalPath = ingestionMatch.suffix && ingestionMatch.suffix.length > 0 ? `/ioc-ingestion/${ingestionMatch.suffix}` : "/ioc-ingestion";
        return {
            pathname: normalized,
            canonicalPath,
            module: "Operations",
            title: subroute?.title ?? route?.title ?? "IOCs Explorer",
            subtitle: subroute?.subtitle ?? route?.subtitle ?? "Explore IoC ingestion health and normalized data readiness.",
            breadcrumbs: buildIngestionBreadcrumbs(subroute),
            route,
            caseRoute: null,
            caseId: null
        };
    }
    if (parseResultIngestionPath(normalized)) {
        const route = ROUTE_BY_HREF.get("/results-ingestion") ?? null;
        return {
            pathname: normalized,
            canonicalPath: "/results-ingestion",
            module: "Operations",
            title: route?.title ?? "Scans",
            subtitle: route?.subtitle ?? "Search scan outcomes and normalized detection history.",
            breadcrumbs: buildRouteBreadcrumbs(route ?? WORKBENCH_ROUTES[0]),
            route,
            caseRoute: null,
            caseId: null
        };
    }
    if (parseScanPlanPath(normalized)) {
        const route = ROUTE_BY_HREF.get("/scan-plan") ?? null;
        return {
            pathname: normalized,
            canonicalPath: "/scan-plan",
            module: "Operations",
            title: route?.title ?? "Scan Plan",
            subtitle: route?.subtitle ?? "Reusable scan execution plans and recent run posture.",
            breadcrumbs: buildRouteBreadcrumbs(route ?? WORKBENCH_ROUTES[0]),
            route,
            caseRoute: null,
            caseId: null
        };
    }
    const serversMatch = parseServersPath(normalized);
    if (serversMatch) {
        const route = ROUTE_BY_HREF.get("/servers") ?? null;
        if (serversMatch.kind === "server") {
            return {
                pathname: normalized,
                canonicalPath: `/servers/servers/${serversMatch.serverId}`,
                module: "Operations",
                title: `Server Detail - Server ${serversMatch.serverId.slice(0, 11)}`,
                subtitle: "Host-level posture, scanner coverage, and distribution state.",
                breadcrumbs: buildServerDetailBreadcrumbs(serversMatch.serverId),
                route,
                caseRoute: null,
                caseId: null
            };
        }
        const subroute = serversMatch.suffix === null ? null : SERVERS_SUBROUTE_BY_SUFFIX.get(serversMatch.suffix) ?? null;
        const canonicalPath = serversMatch.suffix && serversMatch.suffix.length > 0 ? `/servers/${serversMatch.suffix}` : "/servers";
        return {
            pathname: normalized,
            canonicalPath,
            module: "Operations",
            title: subroute?.title ?? route?.title ?? "Targets / Servers",
            subtitle: subroute?.subtitle ?? route?.subtitle ?? "Server inventory and scanner posture.",
            breadcrumbs: buildServersBreadcrumbs(subroute),
            route,
            caseRoute: null,
            caseId: null
        };
    }
    if (parseDistributionPath(normalized)) {
        const route = ROUTE_BY_HREF.get("/distribution") ?? null;
        return {
            pathname: normalized,
            canonicalPath: "/distribution",
            module: "Operations",
            title: route?.title ?? "Rule Distribution",
            subtitle: route?.subtitle ?? "Controlled distribution and staged promotion of rules.",
            breadcrumbs: buildRouteBreadcrumbs(route ?? WORKBENCH_ROUTES[0]),
            route,
            caseRoute: null,
            caseId: null
        };
    }
    if (parseReportingPath(normalized)) {
        const route = ROUTE_BY_HREF.get("/reporting") ?? null;
        return {
            pathname: normalized,
            canonicalPath: "/reporting",
            module: "Operations",
            title: route?.title ?? "Reports",
            subtitle: route?.subtitle ?? "Operational reporting and audit summaries.",
            breadcrumbs: buildRouteBreadcrumbs(route ?? WORKBENCH_ROUTES[0]),
            route,
            caseRoute: null,
            caseId: null
        };
    }
    const canonicalPath = ALIAS_TO_CANONICAL.get(normalized) ?? normalized;
    const route = ROUTE_BY_HREF.get(canonicalPath) ?? ROUTE_BY_HREF.get("/overview") ?? null;
    if (!route) {
        return {
            pathname: normalized,
            canonicalPath: "/overview",
            module: "Core",
            title: "Overview",
            subtitle: "Operational posture across ingestion, rules, scans, and alerts.",
            breadcrumbs: [
                {
                    label: "Core"
                },
                {
                    label: "Overview",
                    href: "/overview"
                }
            ],
            route: null,
            caseRoute: null,
            caseId: null
        };
    }
    return {
        pathname: normalized,
        canonicalPath: route.href,
        module: route.module,
        title: route.title,
        subtitle: route.subtitle,
        breadcrumbs: buildRouteBreadcrumbs(route),
        route,
        caseRoute: null,
        caseId: null
    };
}
function isWorkbenchNavActive(pathname, href) {
    const resolved = resolveWorkbenchRoute(pathname);
    if (resolved.caseId && href === "/alerts") {
        return true;
    }
    if (href === "/rules" && resolved.canonicalPath.startsWith("/rules")) {
        return true;
    }
    if (href === "/ioc-ingestion" && resolved.canonicalPath.startsWith("/ioc-ingestion")) {
        return true;
    }
    if (href === "/results-ingestion" && resolved.canonicalPath.startsWith("/results-ingestion")) {
        return true;
    }
    if (href === "/scan-plan" && resolved.canonicalPath.startsWith("/scan-plan")) {
        return true;
    }
    if (href === "/servers" && resolved.canonicalPath.startsWith("/servers")) {
        return true;
    }
    if (href === "/distribution" && resolved.canonicalPath.startsWith("/distribution")) {
        return true;
    }
    if (href === "/reporting" && resolved.canonicalPath.startsWith("/reporting")) {
        return true;
    }
    return resolved.canonicalPath === href;
}
function getWorkbenchNavByModule() {
    const grouped = new Map(WORKBENCH_MODULE_ORDER.map((module)=>[
            module,
            []
        ]));
    for (const route of WORKBENCH_ROUTES){
        grouped.get(route.module)?.push(route);
    }
    return WORKBENCH_MODULE_ORDER.map((module)=>({
            module,
            routes: grouped.get(module) ?? []
        }));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/workbench/nav.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "CASE_SUBROUTES",
    ()=>CASE_SUBROUTES,
    "NAV_ITEMS",
    ()=>NAV_ITEMS,
    "QUEUE_FOCUS_ITEMS",
    ()=>QUEUE_FOCUS_ITEMS
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$workbench$2d$route$2d$meta$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/workbench/workbench-route-meta.ts [app-client] (ecmascript)");
;
const NAV_ITEMS = [
    ...__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$workbench$2d$route$2d$meta$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["WORKBENCH_ROUTES"].map((route)=>({
            href: route.href,
            label: route.label,
            icon: route.icon,
            section: route.module,
            subtitle: route.subtitle,
            commandAlias: route.commandAliases[0] ?? route.label
        }))
];
const QUEUE_FOCUS_ITEMS = [
    {
        key: "critical",
        label: "Critical Triage",
        description: "Show alerts with the highest triage score and response pressure.",
        href: "/queue?state=critical"
    },
    {
        key: "awaitingapproval",
        label: "Awaiting Approval",
        description: "Queue subset waiting for lead/admin sign-off before alert action.",
        href: "/queue?state=awaitingapproval"
    },
    {
        key: "missing-evidence",
        label: "Missing Evidence",
        description: "Prioritize alerts with unresolved evidence gaps.",
        href: "/queue?missing=1&group=decisionState"
    },
    {
        key: "sla-critical",
        label: "SLA Critical",
        description: "Focus on alerts close to SLA expiry and high operational pressure.",
        href: "/queue?minSla=80&group=slaBand"
    },
    {
        key: "canarywatch",
        label: "Fleet Watch",
        description: "Jump to server fleet and rollout monitoring.",
        href: "/servers"
    }
];
const CASE_SUBROUTES = [
    ...__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$workbench$2d$route$2d$meta$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["WORKBENCH_CASE_ROUTES"].map((route)=>({
            href: route.suffix ? `/alerts/[id]/${route.suffix}` : "/alerts/[id]",
            label: route.label,
            icon: route.icon,
            section: "Alert",
            subtitle: route.subtitle,
            commandAlias: route.commandAliases[0] ?? route.label
        }))
];
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/shared/api/error.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ApiError",
    ()=>ApiError
]);
class ApiError extends Error {
    status;
    payload;
    title;
    detail;
    dependency;
    condition;
    dependencyType;
    retryable;
    isSchemaValidationFailure;
    constructor(message, status, payload = null, options = {}){
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.payload = payload;
        this.title = options.title ?? null;
        this.detail = options.detail ?? null;
        this.dependency = options.dependency ?? null;
        this.condition = options.condition ?? null;
        this.dependencyType = options.dependencyType ?? null;
        this.retryable = options.retryable ?? null;
        this.isSchemaValidationFailure = options.isSchemaValidationFailure ?? false;
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/shared/api/client.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getApiBaseForDisplay",
    ()=>getApiBaseForDisplay,
    "requestForm",
    ()=>requestForm,
    "requestJson",
    ()=>requestJson
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/api/error.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$auth$2f$session$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/auth/session.ts [app-client] (ecmascript)");
;
;
const API_BASE_URL = ("TURBOPACK compile-time value", "http://localhost:5127")?.replace(/\/$/, "") ?? "http://localhost:5127";
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
function readString(value, key) {
    const raw = value[key];
    return typeof raw === "string" && raw.trim().length > 0 ? raw : null;
}
function readNumber(value, key) {
    const raw = value[key];
    return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}
function readBoolean(value, key) {
    const raw = value[key];
    return typeof raw === "boolean" ? raw : null;
}
function parseProblemDetails(payload) {
    if (!isRecord(payload)) {
        return null;
    }
    const details = {
        title: readString(payload, "title"),
        detail: readString(payload, "detail"),
        status: readNumber(payload, "status"),
        dependency: readString(payload, "dependency"),
        condition: readString(payload, "condition"),
        dependencyType: readString(payload, "dependencyType"),
        retryable: readBoolean(payload, "retryable")
    };
    const hasAnyStructuredField = details.title !== null || details.detail !== null || details.status !== null || details.dependency !== null || details.condition !== null || details.dependencyType !== null || details.retryable !== null;
    return hasAnyStructuredField ? details : null;
}
function deriveErrorMessage(payload, status, problemDetails) {
    if (problemDetails?.detail) {
        return problemDetails.detail;
    }
    if (problemDetails?.title) {
        return problemDetails.title;
    }
    if (typeof payload === "string" && payload.length > 0) {
        return payload;
    }
    return `Request failed with status ${status}`;
}
function buildUrl(path) {
    if (/^https?:\/\//i.test(path)) {
        return path;
    }
    if ("TURBOPACK compile-time truthy", 1) {
        return path;
    }
    //TURBOPACK unreachable
    ;
}
async function requestJson(path, schema, options = {}) {
    const headers = new Headers({
        Accept: "application/json"
    });
    if (options.body !== undefined) {
        headers.set("Content-Type", "application/json");
    }
    if (options.auth !== false) {
        const session = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$auth$2f$session$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getSession"])();
        if (session?.token) {
            headers.set("Authorization", `Bearer ${session.token}`);
        }
    }
    const response = await fetch(buildUrl(path), {
        method: options.method ?? "GET",
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
        cache: "no-store",
        credentials: "omit",
        signal: options.signal
    });
    let payload = null;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
        payload = await response.json();
    } else {
        const text = await response.text();
        payload = text || null;
    }
    if (!response.ok) {
        if (response.status === 401) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$auth$2f$session$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearSession"])();
        }
        const problemDetails = parseProblemDetails(payload);
        const message = deriveErrorMessage(payload, response.status, problemDetails);
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ApiError"](message, response.status, payload, {
            title: problemDetails?.title,
            detail: problemDetails?.detail,
            dependency: problemDetails?.dependency,
            condition: problemDetails?.condition,
            dependencyType: problemDetails?.dependencyType,
            retryable: problemDetails?.retryable
        });
    }
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ApiError"](`Schema validation failed for ${path}`, 500, parsed.error.flatten(), {
            isSchemaValidationFailure: true
        });
    }
    return parsed.data;
}
async function requestForm(path, schema, options) {
    const headers = new Headers({
        Accept: "application/json"
    });
    if (options.auth !== false) {
        const session = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$auth$2f$session$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getSession"])();
        if (session?.token) {
            headers.set("Authorization", `Bearer ${session.token}`);
        }
    }
    const response = await fetch(buildUrl(path), {
        method: options.method ?? "POST",
        headers,
        body: options.formData,
        cache: "no-store",
        credentials: "omit",
        signal: options.signal
    });
    let payload = null;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
        payload = await response.json();
    } else {
        const text = await response.text();
        payload = text || null;
    }
    if (!response.ok) {
        if (response.status === 401) {
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$auth$2f$session$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clearSession"])();
        }
        const problemDetails = parseProblemDetails(payload);
        const message = deriveErrorMessage(payload, response.status, problemDetails);
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ApiError"](message, response.status, payload, {
            title: problemDetails?.title,
            detail: problemDetails?.detail,
            dependency: problemDetails?.dependency,
            condition: problemDetails?.condition,
            dependencyType: problemDetails?.dependencyType,
            retryable: problemDetails?.retryable
        });
    }
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
        throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ApiError"](`Schema validation failed for ${path}`, 500, parsed.error.flatten(), {
            isSchemaValidationFailure: true
        });
    }
    return parsed.data;
}
function getApiBaseForDisplay() {
    return "/api (rewritten)";
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/shared/api/schemas.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "alertListResponseSchema",
    ()=>alertListResponseSchema,
    "alertResponseSchema",
    ()=>alertResponseSchema,
    "alertRuleWorkflowResponseSchema",
    ()=>alertRuleWorkflowResponseSchema,
    "auditLogListResponseSchema",
    ()=>auditLogListResponseSchema,
    "auditLogResponseSchema",
    ()=>auditLogResponseSchema,
    "caseResponseSchema",
    ()=>caseResponseSchema,
    "caseRuleWorkflowResponseSchema",
    ()=>caseRuleWorkflowResponseSchema,
    "coveragePainAnalysisResponseSchema",
    ()=>coveragePainAnalysisResponseSchema,
    "coveragePainGapAnalysisSchema",
    ()=>coveragePainGapAnalysisSchema,
    "coveragePainScopeSchema",
    ()=>coveragePainScopeSchema,
    "coveragePainScoreSemanticsSchema",
    ()=>coveragePainScoreSemanticsSchema,
    "coveragePainTierAnalysisSchema",
    ()=>coveragePainTierAnalysisSchema,
    "coveragePainTierSignalBreakdownSchema",
    ()=>coveragePainTierSignalBreakdownSchema,
    "decisionResponseSchema",
    ()=>decisionResponseSchema,
    "deploymentRecommendationResponseSchema",
    ()=>deploymentRecommendationResponseSchema,
    "deploymentResponseSchema",
    ()=>deploymentResponseSchema,
    "detectionHistoryItemResponseSchema",
    ()=>detectionHistoryItemResponseSchema,
    "detectionHistoryProvenanceResponseSchema",
    ()=>detectionHistoryProvenanceResponseSchema,
    "detectionHistoryResponseSchema",
    ()=>detectionHistoryResponseSchema,
    "discoveredHostResponseSchema",
    ()=>discoveredHostResponseSchema,
    "discoveryRunResponseSchema",
    ()=>discoveryRunResponseSchema,
    "evidenceResponseSchema",
    ()=>evidenceResponseSchema,
    "feedSourceResponseSchema",
    ()=>feedSourceResponseSchema,
    "feedbackResponseSchema",
    ()=>feedbackResponseSchema,
    "healthAdminSchema",
    ()=>healthAdminSchema,
    "healthInfoSchema",
    ()=>healthInfoSchema,
    "healthReadyComponentSchema",
    ()=>healthReadyComponentSchema,
    "healthReadySchema",
    ()=>healthReadySchema,
    "iocListResponseSchema",
    ()=>iocListResponseSchema,
    "iocResponseSchema",
    ()=>iocResponseSchema,
    "jobRunResponseSchema",
    ()=>jobRunResponseSchema,
    "managedServerConnectionSecretMetadataResponseSchema",
    ()=>managedServerConnectionSecretMetadataResponseSchema,
    "managedServerInventoryResponseSchema",
    ()=>managedServerInventoryResponseSchema,
    "managedServerResponseSchema",
    ()=>managedServerResponseSchema,
    "managedServerScannerAssignmentResponseSchema",
    ()=>managedServerScannerAssignmentResponseSchema,
    "powerBiVisualizationCatalogResponseSchema",
    ()=>powerBiVisualizationCatalogResponseSchema,
    "powerBiVisualizationResponseSchema",
    ()=>powerBiVisualizationResponseSchema,
    "powerBiWorkspaceResponseSchema",
    ()=>powerBiWorkspaceResponseSchema,
    "promoteDiscoveredHostResponseSchema",
    ()=>promoteDiscoveredHostResponseSchema,
    "reportListResponseSchema",
    ()=>reportListResponseSchema,
    "reportResponseSchema",
    ()=>reportResponseSchema,
    "roleResponseSchema",
    ()=>roleResponseSchema,
    "rollbackPlanResponseSchema",
    ()=>rollbackPlanResponseSchema,
    "rolloutPlanResponseSchema",
    ()=>rolloutPlanResponseSchema,
    "ruleDetailSchema",
    ()=>ruleDetailSchema,
    "ruleDistributionAttemptResponseSchema",
    ()=>ruleDistributionAttemptResponseSchema,
    "ruleDistributionJobResponseSchema",
    ()=>ruleDistributionJobResponseSchema,
    "ruleDistributionTargetAttemptResponseSchema",
    ()=>ruleDistributionTargetAttemptResponseSchema,
    "ruleDistributionTargetResponseSchema",
    ()=>ruleDistributionTargetResponseSchema,
    "ruleFamilySchema",
    ()=>ruleFamilySchema,
    "ruleImportAttemptSchema",
    ()=>ruleImportAttemptSchema,
    "ruleListItemSchema",
    ()=>ruleListItemSchema,
    "ruleListResponseSchema",
    ()=>ruleListResponseSchema,
    "ruleProposalResponseSchema",
    ()=>ruleProposalResponseSchema,
    "ruleResponseSchema",
    ()=>ruleResponseSchema,
    "ruleRevisionItemSchema",
    ()=>ruleRevisionItemSchema,
    "ruleScopeTypeSchema",
    ()=>ruleScopeTypeSchema,
    "ruleSimulationResultResponseSchema",
    ()=>ruleSimulationResultResponseSchema,
    "ruleValidationCapabilityDepthSchema",
    ()=>ruleValidationCapabilityDepthSchema,
    "ruleValidationDiagnosticSchema",
    ()=>ruleValidationDiagnosticSchema,
    "ruleValidationResultSchema",
    ()=>ruleValidationResultSchema,
    "ruleValidationSeveritySchema",
    ()=>ruleValidationSeveritySchema,
    "ruleValidationStageResultSchema",
    ()=>ruleValidationStageResultSchema,
    "ruleValidationStageSchema",
    ()=>ruleValidationStageSchema,
    "scanCadenceTypeSchema",
    ()=>scanCadenceTypeSchema,
    "scanJobResponseSchema",
    ()=>scanJobResponseSchema,
    "scanJobTargetExecutionResponseSchema",
    ()=>scanJobTargetExecutionResponseSchema,
    "scanPlanResponseSchema",
    ()=>scanPlanResponseSchema,
    "scanPlanRuleSummaryResponseSchema",
    ()=>scanPlanRuleSummaryResponseSchema,
    "scanPlanTargetSummaryResponseSchema",
    ()=>scanPlanTargetSummaryResponseSchema,
    "scanRuleSelectionModeSchema",
    ()=>scanRuleSelectionModeSchema,
    "scannerCapabilitySchema",
    ()=>scannerCapabilitySchema,
    "scannerResponseSchema",
    ()=>scannerResponseSchema,
    "subnetResponseSchema",
    ()=>subnetResponseSchema,
    "targetGroupMemberResponseSchema",
    ()=>targetGroupMemberResponseSchema,
    "targetGroupResponseSchema",
    ()=>targetGroupResponseSchema,
    "targetServerResponseSchema",
    ()=>targetServerResponseSchema,
    "tokenResponseSchema",
    ()=>tokenResponseSchema,
    "userResponseSchema",
    ()=>userResponseSchema,
    "v2AlertResponseSchema",
    ()=>v2AlertResponseSchema
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-client] (ecmascript) <export * as z>");
;
const tokenResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    accessToken: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1),
    expiresAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1),
    tokenType: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1)
});
const safeString = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].union([
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].null(),
    __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].undefined()
]).transform((value)=>typeof value === "string" ? value : "");
const caseResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    title: safeString,
    summary: safeString,
    priority: safeString,
    status: safeString,
    ownerUserId: safeString,
    approvalTierRequired: safeString,
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const alertResponseSchema = caseResponseSchema;
const v2AlertResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    title: safeString,
    summary: safeString,
    severity: safeString,
    status: safeString,
    ownerUserId: safeString,
    approvalTierRequired: safeString,
    firstDetectedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    lastDetectedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const alertListResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    items: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(v2AlertResponseSchema),
    totalCount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    page: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    pageSize: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int()
});
const evidenceResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    caseId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    evidenceType: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    sourceSystem: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    contentHash: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    confidence: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    collectedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const decisionResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    caseId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    state: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    recommendedAction: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    approvalTierRequired: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    policyVersion: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    modelVersion: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    reasoning: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    approvedByUserId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    approvedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const ruleFamilySchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
    "yara",
    "sigma",
    "snort",
    "suricata"
]);
const ruleResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    caseId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    ruleFamily: ruleFamilySchema,
    ruleBody: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    version: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const ruleScopeTypeSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
    "global",
    "environment",
    "subnet",
    "server",
    "scanner"
]);
const ruleValidationSeveritySchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
    "error",
    "warning",
    "note"
]);
const ruleValidationStageSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
    "syntax",
    "metadata",
    "deployment_readiness"
]);
const ruleValidationCapabilityDepthSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
    "full_engine",
    "heuristic",
    "not_available"
]);
const ruleValidationDiagnosticSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    code: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    severity: ruleValidationSeveritySchema,
    message: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    line: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().nullable(),
    column: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().nullable()
});
const ruleValidationStageResultSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    stage: ruleValidationStageSchema,
    passed: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    capabilityDepth: ruleValidationCapabilityDepthSchema,
    limitation: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    diagnostics: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(ruleValidationDiagnosticSchema)
});
const ruleValidationResultSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    canPersist: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    isDeploymentReady: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    evaluatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    stages: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(ruleValidationStageResultSchema)
});
const ruleImportAttemptSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    fileName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    fileHash: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    declaredRuleFamily: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    wasSuccessful: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    failureReason: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    sourceMetadataJson: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    parsedMetadataJson: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    diagnostics: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(ruleValidationDiagnosticSchema),
    validation: ruleValidationResultSchema,
    ruleArtifactId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().nullable(),
    ruleRevisionId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().nullable(),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    createdByUserId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const ruleListItemSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    ruleFamily: ruleFamilySchema,
    source: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    description: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    tags: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()),
    severity: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    scopeType: ruleScopeTypeSchema,
    scopeValue: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    currentRevisionNumber: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    currentVersionLabel: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    isDeleted: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    createdByUserId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedByUserId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const ruleRevisionItemSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    ruleArtifactId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    revisionNumber: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    versionLabel: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    originalContent: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    metadataJson: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    changeType: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    changeReason: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    validation: ruleValidationResultSchema,
    ruleImportAttemptId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().nullable(),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    createdByUserId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const ruleDetailSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    rule: ruleListItemSchema,
    currentRevision: ruleRevisionItemSchema,
    revisions: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(ruleRevisionItemSchema),
    importAttempts: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(ruleImportAttemptSchema)
});
const ruleListResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    items: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(ruleListItemSchema),
    totalCount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    page: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    pageSize: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int()
});
const deploymentResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    caseId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    ruleId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    targetEnvironment: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    requestedByUserId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    approvedByUserId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    approvedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    deployedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const ruleProposalResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    caseId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    proposalName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    ruleFamily: ruleFamilySchema,
    ruleBody: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    proposedVersion: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    proposedByUserId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    rationale: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    policyRiskScore: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    reviewedByUserId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    reviewedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    reviewReason: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    overrideReason: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const deploymentRecommendationResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    caseId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    ruleProposalId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    targetEnvironment: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    recommendedStage: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    riskScore: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    predictedNoise: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    baselineNoise: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    predictedNoiseDelta: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    analystAcceptanceRate: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    requiresHumanApproval: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    autoPublishEnabled: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    requestedByUserId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    rationale: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    recommendedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const rolloutPlanResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    caseId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    ruleProposalId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    deploymentRecommendationId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    currentStage: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    canaryTrafficPercent: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    predictedNoise: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    observedNoise: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().nullable(),
    observedNoiseDelta: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().nullable(),
    analystAcceptanceRate: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    requiresManualPromotion: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    shadowStartedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    canaryStartedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    promotedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    rolledBackAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    lastStageReason: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    lastOverrideReason: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const rollbackPlanResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    caseId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    ruleProposalId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    rolloutPlanId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    triggerCondition: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    recoveryPlaybook: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    predictedNoiseThreshold: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    lastObservedNoise: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().nullable(),
    triggerConditionMet: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    isTriggered: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    triggeredByUserId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    triggeredAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    triggerReason: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const ruleSimulationResultResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    proposal: ruleProposalResponseSchema,
    recommendation: deploymentRecommendationResponseSchema,
    rolloutPlan: rolloutPlanResponseSchema,
    rollbackPlan: rollbackPlanResponseSchema
});
const caseRuleWorkflowResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    caseId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    proposals: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(ruleProposalResponseSchema),
    recommendations: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(deploymentRecommendationResponseSchema),
    rolloutPlans: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(rolloutPlanResponseSchema),
    rollbackPlans: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(rollbackPlanResponseSchema),
    analystAcceptanceRate: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number()
});
const alertRuleWorkflowResponseSchema = caseRuleWorkflowResponseSchema;
const feedbackResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    caseId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    decisionId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().nullable(),
    verdict: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    notes: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    submittedByUserId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    submittedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const healthInfoSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    service: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    environment: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    utcNow: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const healthAdminSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    runtime: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    machineName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    processId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number()
});
const healthReadyComponentSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        "healthy",
        "degraded",
        "unhealthy"
    ]),
    required: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    message: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const healthReadySchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        "ready",
        "not_ready"
    ]),
    components: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(healthReadyComponentSchema)
});
const userResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    userName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    displayName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const roleResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const subnetResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    networkId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    cidrBlock: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    gateway: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const targetServerResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    subnetId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    hostname: safeString,
    ipAddress: safeString,
    operatingSystem: safeString,
    environment: safeString,
    status: safeString,
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const targetGroupResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    description: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    isEnabled: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    memberCount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const targetGroupMemberResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    targetGroupId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    targetServerId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    hostname: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    ipAddress: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    addedByUserId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    addedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const ruleDistributionJobResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    ruleRevisionId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    ruleFamily: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    revisionNumber: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    versionLabel: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    operatorUserId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    attemptCount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    maxAttempts: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    totalTargets: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    successfulTargets: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    failedTargets: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    unreachableTargets: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    validationFailedTargets: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    partiallyAppliedTargets: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    queuedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    startedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    completedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    nextAttemptAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    summary: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    notes: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const ruleDistributionAttemptResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    ruleDistributionJobId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    attemptNumber: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    startedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    completedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    backoffSeconds: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().nullable(),
    triggeredByUserId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    summary: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const ruleDistributionTargetAttemptResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    ruleDistributionAttemptId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    ruleDistributionTargetId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    transport: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    remoteCorrelationId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    diagnostic: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    isRetryable: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    startedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    completedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const ruleDistributionTargetResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    ruleDistributionJobId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    targetServerId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    targetHostname: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    targetIpAddress: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    isRetryable: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    attemptCount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    lastError: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    lastAttemptAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    succeededAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    attempts: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(ruleDistributionTargetAttemptResponseSchema)
});
const scannerCapabilitySchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
    "Yara",
    "Sigma",
    "Snort",
    "Suricata"
]);
const scanRuleSelectionModeSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
    "RuleSet",
    "RuleScope"
]);
const scanCadenceTypeSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
    "Manual",
    "Interval",
    "Daily",
    "Weekly"
]);
const scanPlanTargetSummaryResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    targetServerId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    hostname: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    ipAddress: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const scanPlanRuleSummaryResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    ruleRevisionId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    ruleArtifactId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    ruleName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    ruleFamily: ruleFamilySchema,
    revisionNumber: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    versionLabel: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const scanPlanResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    description: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    scannerCapability: scannerCapabilitySchema,
    ruleSelectionMode: scanRuleSelectionModeSchema,
    ruleScopeType: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    ruleScopeValue: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    cadenceType: scanCadenceTypeSchema,
    intervalMinutes: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().nullable(),
    runAtHourUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().nullable(),
    runAtMinuteUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().nullable(),
    weeklyDayOfWeek: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().nullable(),
    operatorNotes: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    nextRunAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    lastQueuedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    lastCompletedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    lastResultStatus: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    lastResultSummary: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    targetServerIds: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid()),
    ruleRevisionIds: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid()),
    targetServers: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(scanPlanTargetSummaryResponseSchema),
    rules: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(scanPlanRuleSummaryResponseSchema),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const scanJobResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    scanPlanId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().nullable(),
    triggerSource: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    queuedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    startedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    completedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    triggeredByUserId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    summary: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    cancellationRequested: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    cancellationRequestedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    cancellationReason: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    totalTargets: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    completedTargets: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    failedTargets: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    cancelledTargets: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    partiallyCompletedTargets: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const scanJobTargetExecutionResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    scanJobId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    targetServerId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    targetHostname: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    targetIpAddress: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    scannerId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().nullable(),
    scannerName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    startedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    completedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    summary: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    errorMessage: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const scannerResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    engineType: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    version: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    healthStatus: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    lastHeartbeatUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    capabilities: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(scannerCapabilitySchema)
});
const managedServerScannerAssignmentResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    targetServerId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    scannerId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    scannerName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    connectivityStatus: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    lastHeartbeatUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    lastContactUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    isEnabled: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    capabilities: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(scannerCapabilitySchema),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const managedServerResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    subnetId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    hostname: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    ipAddress: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    operatingSystem: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    environment: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    connectivityStatus: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    lastHeartbeatUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    lastContactUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    connectionProtocol: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    connectionHost: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    connectionPort: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int().nullable(),
    connectionAuthMode: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    connectionUsername: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    hasConnectionSecret: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    connectionSecretUpdatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    scannerAssignments: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(managedServerScannerAssignmentResponseSchema),
    scannerCapabilities: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(scannerCapabilitySchema),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const managedServerInventoryResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    servers: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(managedServerResponseSchema),
    totalServers: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    unhealthyServers: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    unreachableServers: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    staleContactServers: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    page: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    pageSize: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int()
});
const feedSourceResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    sourceType: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    endpoint: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    isEnabled: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const iocResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    feedSourceId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    iocFileId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().nullable(),
    type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    value: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    severity: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    confidence: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    firstSeenAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    lastSeenAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    feedSourceName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable().optional(),
    feedSourceType: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable().optional(),
    fileName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable().optional()
});
const iocListResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    items: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(iocResponseSchema),
    totalCount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    page: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    pageSize: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int()
});
const reportResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    title: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    reportType: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    summaryJson: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    generatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    updatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    alertIds: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid())
});
const reportListResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    items: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(reportResponseSchema),
    totalCount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    page: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    pageSize: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int()
});
const powerBiWorkspaceResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    key: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    displayName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    description: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    workspaceId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const powerBiVisualizationResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    key: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    title: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    description: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    workspaceKey: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    workspaceName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    workspaceId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    reportId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    embedUrl: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    requiresUserSignIn: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    isConfigured: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    isDefault: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    embedHeightPx: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    tags: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string())
});
const powerBiVisualizationCatalogResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    defaultVisualizationKey: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    message: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    workspaces: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(powerBiWorkspaceResponseSchema),
    visualizations: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(powerBiVisualizationResponseSchema)
});
const auditLogResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    actorUserId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    actionType: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    entityType: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    entityId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    payloadJson: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    occurredAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const auditLogListResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    items: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(auditLogResponseSchema),
    totalCount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    page: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    pageSize: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int()
});
const detectionHistoryProvenanceResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    ingestionRunId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    rowIndex: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    isDuplicate: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    observedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    rawPayloadHash: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    rawSampleJson: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    correlationMetadataJson: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    scanJobId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().nullable(),
    jobAttemptId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().nullable(),
    targetExecutionId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().nullable(),
    createdAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const detectionHistoryItemResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    fingerprint: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    scannerFamily: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    serverId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    scanJobId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().nullable(),
    jobAttemptId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().nullable(),
    targetExecutionId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().nullable(),
    ruleRevisionId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().nullable(),
    iocId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().nullable(),
    disposition: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    confidence: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    observedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    firstObservedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    lastObservedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    occurrenceCount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    isExecutionArtifact: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    evidenceJson: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    rawPayloadHash: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    provenanceCount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    provenance: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(detectionHistoryProvenanceResponseSchema),
    serverHostname: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable().optional(),
    iocValue: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable().optional(),
    ruleName: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable().optional(),
    source: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable().optional()
});
const detectionHistoryResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    total: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    take: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    skip: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number().int(),
    items: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(detectionHistoryItemResponseSchema)
});
const managedServerConnectionSecretMetadataResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    targetServerId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    hasConnectionSecret: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    connectionSecretUpdatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable()
});
const discoveryRunResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    subnetId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    requestedCidr: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    rangeStartIp: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    rangeEndIp: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    queuedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    startedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    completedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    totalHosts: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    reachableHosts: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    unreachableHosts: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    summary: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const discoveredHostResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    subnetId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    ipAddress: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    hostname: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    reachability: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    firstDiscoveredAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    lastCheckedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    lastSeenAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable(),
    lastDiscoveryRunId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    promotedTargetServerId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid().nullable(),
    promotedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable()
});
const promoteDiscoveredHostResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    discoveredHostId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    targetServerId: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    alreadyPromoted: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].boolean(),
    promotedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const coveragePainScopeSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    scopeType: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    scopeValue: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable()
});
const coveragePainScoreSemanticsSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    readinessRuleWeight: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    readinessTelemetryWeight: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    readinessAttackCoverageWeight: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    readinessFreshnessWeight: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    incidentSightingsWeight: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    incidentDetectionsWeight: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    incidentCasePressureWeight: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    incidentRecencyWeight: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    trendWindowDays: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    freshnessFullCreditDays: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    freshnessZeroCreditDays: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number()
});
const coveragePainTierSignalBreakdownSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    caseCount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    detectionCount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    ruleCount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    attackMappingCount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    telemetrySignalCount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    sightingsCount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number()
});
const coveragePainTierAnalysisSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    tier: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    readinessScore: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    incidentActivityScore: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    confidence: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    freshness: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    indicatorCount: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    trend: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    missingDataStatus: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    topGaps: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()),
    recommendedActions: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()),
    signalBreakdown: coveragePainTierSignalBreakdownSchema
});
const coveragePainGapAnalysisSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    strongestTiers: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()),
    weakestTiers: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()),
    lowTierAverageReadiness: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    highTierAverageReadiness: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    lowVsHighTierImbalance: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].number(),
    suggestedImprovementDirection: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string()
});
const coveragePainAnalysisResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    generatedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    scope: coveragePainScopeSchema,
    scoreSemantics: coveragePainScoreSemanticsSchema,
    tiers: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(coveragePainTierAnalysisSchema),
    painGapAnalysis: coveragePainGapAnalysisSchema
});
const jobRunResponseSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    id: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().uuid(),
    jobType: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    status: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    triggeredBy: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    details: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    startedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string(),
    completedAtUtc: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().nullable()
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/shared/gateway/aspnet-gateway.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AspNetGateway",
    ()=>AspNetGateway
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v4/classic/external.js [app-client] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/api/client.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/api/error.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/api/schemas.ts [app-client] (ecmascript)");
;
;
;
;
const alertsSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["alertResponseSchema"]);
const evidenceSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["evidenceResponseSchema"]);
const decisionsSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["decisionResponseSchema"]);
const rulesSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ruleResponseSchema"]);
const deploymentsSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deploymentResponseSchema"]);
const feedbackSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["feedbackResponseSchema"]);
const jobsSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jobRunResponseSchema"]);
const usersSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["userResponseSchema"]);
const rolesSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["roleResponseSchema"]);
const subnetsSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["subnetResponseSchema"]);
const targetServersSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["targetServerResponseSchema"]);
const targetGroupsSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["targetGroupResponseSchema"]);
const targetGroupMembersSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["targetGroupMemberResponseSchema"]);
const ruleDistributionJobsSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ruleDistributionJobResponseSchema"]);
const ruleDistributionAttemptsSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ruleDistributionAttemptResponseSchema"]);
const ruleDistributionTargetsSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ruleDistributionTargetResponseSchema"]);
const scanPlansSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scanPlanResponseSchema"]);
const scanJobsSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scanJobResponseSchema"]);
const scanJobTargetsSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scanJobTargetExecutionResponseSchema"]);
const scannersSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scannerResponseSchema"]);
const discoveryRunsSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["discoveryRunResponseSchema"]);
const discoveredHostsSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["discoveredHostResponseSchema"]);
const recommendationsSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deploymentRecommendationResponseSchema"]);
const rolloutsSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["rolloutPlanResponseSchema"]);
const rollbacksSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["rollbackPlanResponseSchema"]);
const ruleRevisionsSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ruleRevisionItemSchema"]);
const ruleImportAttemptsSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ruleImportAttemptSchema"]);
function isRecoverableCompatibilityReadError(error) {
    if (!(error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ApiError"])) {
        return false;
    }
    if (error.isSchemaValidationFailure) {
        return true;
    }
    const message = `${error.detail ?? ""} ${error.message ?? ""}`.toLowerCase();
    const hasCompatibilityMarker = message.includes("invalid object name") || message.includes("invalid column name") || message.includes("cannot find the object") || message.includes("does not exist") || message.includes("sql exception");
    return error.status >= 500 && hasCompatibilityMarker;
}
async function withLegacyEmptyFallback(operation, fallback) {
    try {
        return await operation();
    } catch (error) {
        if (isRecoverableCompatibilityReadError(error)) {
            return await fallback();
        }
        throw error;
    }
}
function resolvePage(page) {
    return typeof page === "number" && page > 0 ? page : 1;
}
function resolvePageSize(pageSize, fallback = 20) {
    return typeof pageSize === "number" && pageSize > 0 ? pageSize : fallback;
}
function emptyPagedItems(page, pageSize) {
    return {
        items: [],
        totalCount: 0,
        page: resolvePage(page),
        pageSize: resolvePageSize(pageSize)
    };
}
class AspNetGateway {
    async login(username, password) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])("/api/auth/token", __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["tokenResponseSchema"], {
            method: "POST",
            auth: false,
            body: {
                userName: username,
                password
            }
        });
    }
    async listAlertRegistry(query = {}, signal) {
        const params = new URLSearchParams();
        if (query.q) {
            params.set("q", query.q);
        }
        if (query.status) {
            params.set("status", query.status);
        }
        if (query.severity) {
            params.set("severity", query.severity);
        }
        if (query.family) {
            params.set("family", query.family);
        }
        if (query.serverId) {
            params.set("serverId", query.serverId);
        }
        if (query.ownerUserId) {
            params.set("ownerUserId", query.ownerUserId);
        }
        if (query.fromUtc) {
            params.set("fromUtc", query.fromUtc);
        }
        if (query.toUtc) {
            params.set("toUtc", query.toUtc);
        }
        if (typeof query.page === "number") {
            params.set("page", String(query.page));
        }
        if (typeof query.pageSize === "number") {
            params.set("pageSize", String(query.pageSize));
        }
        const suffix = params.size > 0 ? `?${params.toString()}` : "";
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/alerts${suffix}`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["alertListResponseSchema"], {
                signal
            }), ()=>emptyPagedItems(query.page, query.pageSize));
    }
    async listAlerts(signal) {
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])("/api/alerts", alertsSchema, {
                signal
            }), ()=>[]);
    }
    async getAlert(alertId, signal) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/alerts/${alertId}`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["alertResponseSchema"], {
            signal
        });
    }
    // Legacy aliases retained for one release cycle.
    async listCases(signal) {
        return this.listAlerts(signal);
    }
    // Legacy aliases retained for one release cycle.
    async getCase(caseId, signal) {
        return this.getAlert(caseId, signal);
    }
    async listReports(query = {}, signal) {
        const params = new URLSearchParams();
        if (query.q) {
            params.set("q", query.q);
        }
        if (query.reportType) {
            params.set("reportType", query.reportType);
        }
        if (query.severity) {
            params.set("severity", query.severity);
        }
        if (query.status) {
            params.set("status", query.status);
        }
        if (query.family) {
            params.set("family", query.family);
        }
        if (query.serverId) {
            params.set("serverId", query.serverId);
        }
        if (query.fromUtc) {
            params.set("fromUtc", query.fromUtc);
        }
        if (query.toUtc) {
            params.set("toUtc", query.toUtc);
        }
        if (typeof query.page === "number") {
            params.set("page", String(query.page));
        }
        if (typeof query.pageSize === "number") {
            params.set("pageSize", String(query.pageSize));
        }
        const suffix = params.size > 0 ? `?${params.toString()}` : "";
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/reports${suffix}`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["reportListResponseSchema"], {
                signal
            }), ()=>emptyPagedItems(query.page, query.pageSize));
    }
    async getPowerBiVisualizationCatalog(signal) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])("/api/v2/reports/power-bi", __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["powerBiVisualizationCatalogResponseSchema"], {
            signal
        });
    }
    async listAuditLogs(query = {}, signal) {
        const params = new URLSearchParams();
        if (query.q) {
            params.set("q", query.q);
        }
        if (query.actorUserId) {
            params.set("actorUserId", query.actorUserId);
        }
        if (query.actionType) {
            params.set("actionType", query.actionType);
        }
        if (query.entityType) {
            params.set("entityType", query.entityType);
        }
        if (query.fromUtc) {
            params.set("fromUtc", query.fromUtc);
        }
        if (query.toUtc) {
            params.set("toUtc", query.toUtc);
        }
        if (typeof query.page === "number") {
            params.set("page", String(query.page));
        }
        if (typeof query.pageSize === "number") {
            params.set("pageSize", String(query.pageSize));
        }
        const suffix = params.size > 0 ? `?${params.toString()}` : "";
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/audit-logs${suffix}`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["auditLogListResponseSchema"], {
                signal
            }), ()=>emptyPagedItems(query.page, query.pageSize));
    }
    async listEvidence(caseId, signal) {
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/evidence/alert/${caseId}`, evidenceSchema, {
                signal
            }), ()=>[]);
    }
    async listDecisions(caseId, signal) {
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/decisions/alert/${caseId}`, decisionsSchema, {
                signal
            }), ()=>[]);
    }
    async listRules(caseId, signal) {
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/rules/alert/${caseId}`, rulesSchema, {
                signal
            }), ()=>[]);
    }
    async listRuleRepository(query = {}, signal) {
        const params = new URLSearchParams();
        if (query.q) {
            params.set("q", query.q);
        }
        if (query.includeContent) {
            params.set("includeContent", "true");
        }
        if (query.family) {
            params.set("family", query.family);
        }
        if (query.severity) {
            params.set("severity", query.severity);
        }
        if (query.status) {
            params.set("status", query.status);
        }
        if (query.scopeType) {
            params.set("scopeType", query.scopeType);
        }
        if (query.source) {
            params.set("source", query.source);
        }
        if (query.tags && query.tags.length > 0) {
            params.set("tags", query.tags.join(","));
        }
        if (query.includeDeleted) {
            params.set("includeDeleted", "true");
        }
        if (query.fromUtc ?? query.updatedFromUtc) {
            params.set("fromUtc", query.fromUtc ?? query.updatedFromUtc ?? "");
        }
        if (query.toUtc ?? query.updatedToUtc) {
            params.set("toUtc", query.toUtc ?? query.updatedToUtc ?? "");
        }
        if (query.actor) {
            params.set("actor", query.actor);
        }
        if (query.version) {
            params.set("version", query.version);
        }
        if (query.sort) {
            params.set("sort", query.sort);
        }
        if (typeof query.page === "number") {
            params.set("page", String(query.page));
        }
        if (typeof query.pageSize === "number") {
            params.set("pageSize", String(query.pageSize));
        }
        const suffix = params.size > 0 ? `?${params.toString()}` : "";
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/rules${suffix}`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ruleListResponseSchema"], {
                signal
            }), ()=>emptyPagedItems(query.page, query.pageSize));
    }
    async getRuleDetail(ruleId, signal) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/rules/${ruleId}`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ruleDetailSchema"], {
            signal
        });
    }
    async createRule(input) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])("/api/v2/rules", __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ruleDetailSchema"], {
            method: "POST",
            body: {
                name: input.name,
                ruleFamily: input.ruleFamily,
                source: input.source,
                description: input.description,
                tags: input.tags,
                severity: input.severity,
                status: input.status,
                scopeType: input.scopeType,
                scopeValue: input.scopeValue ?? null,
                versionLabel: input.versionLabel,
                originalContent: input.originalContent,
                actorUserId: input.actorUserId,
                changeReason: input.changeReason ?? null
            }
        });
    }
    async importRuleFile(input) {
        const form = new FormData();
        form.append("file", input.file);
        form.append("declaredRuleFamily", input.declaredRuleFamily);
        form.append("actorUserId", input.actorUserId);
        if (input.name) {
            form.append("name", input.name);
        }
        if (input.source) {
            form.append("source", input.source);
        }
        if (input.description) {
            form.append("description", input.description);
        }
        if (input.tags && input.tags.length > 0) {
            form.append("tags", input.tags.join(","));
        }
        if (input.severity) {
            form.append("severity", input.severity);
        }
        if (input.status) {
            form.append("status", input.status);
        }
        if (input.scopeType) {
            form.append("scopeType", input.scopeType);
        }
        if (input.scopeValue) {
            form.append("scopeValue", input.scopeValue);
        }
        if (input.versionLabel) {
            form.append("versionLabel", input.versionLabel);
        }
        if (input.changeReason) {
            form.append("changeReason", input.changeReason);
        }
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestForm"])("/api/v2/rules/import", __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ruleImportAttemptSchema"], {
            method: "POST",
            formData: form
        });
    }
    async updateRule(ruleId, input) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/rules/${ruleId}`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ruleDetailSchema"], {
            method: "PATCH",
            body: {
                name: input.name,
                ruleFamily: input.ruleFamily,
                source: input.source,
                description: input.description,
                tags: input.tags,
                severity: input.severity,
                status: input.status,
                scopeType: input.scopeType,
                scopeValue: input.scopeValue ?? null,
                versionLabel: input.versionLabel,
                originalContent: input.originalContent,
                actorUserId: input.actorUserId,
                changeReason: input.changeReason ?? null
            }
        });
    }
    async listRuleRevisions(ruleId, signal) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/rules/${ruleId}/revisions`, ruleRevisionsSchema, {
            signal
        });
    }
    async listRuleImportAttempts(ruleId, signal) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/rules/${ruleId}/imports`, ruleImportAttemptsSchema, {
            signal
        });
    }
    async archiveRule(ruleId, input) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/rules/${ruleId}`, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].null(), {
            method: "DELETE",
            body: {
                actorUserId: input.actorUserId,
                changeReason: input.changeReason ?? null
            }
        });
    }
    async restoreRule(ruleId, input) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/rules/${ruleId}/restore`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ruleDetailSchema"], {
            method: "POST",
            body: {
                actorUserId: input.actorUserId,
                changeReason: input.changeReason ?? null,
                restoredStatus: input.restoredStatus ?? null
            }
        });
    }
    async listDeployments(caseId, signal) {
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/deployments/alert/${caseId}`, deploymentsSchema, {
                signal
            }), ()=>[]);
    }
    async listAllDeployments(signal) {
        const alerts = await this.listAlerts(signal);
        const results = await Promise.allSettled(alerts.map((item)=>this.listDeployments(item.id, signal)));
        const merged = [];
        for (const result of results){
            if (result.status === "fulfilled") {
                merged.push(...result.value);
            }
        }
        return merged.sort((a, b)=>Date.parse(b.updatedAtUtc) - Date.parse(a.updatedAtUtc));
    }
    async listFeedback(caseId, signal) {
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/feedback/alert/${caseId}`, feedbackSchema, {
                signal
            }), ()=>[]);
    }
    async listJobRuns(signal) {
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])("/api/admin/jobs/runs?take=20", jobsSchema, {
                signal
            }), ()=>[]);
    }
    async listUsers(signal) {
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])("/api/v2/identity/users", usersSchema, {
                signal
            }), ()=>[]);
    }
    async listRoles(signal) {
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])("/api/v2/identity/roles", rolesSchema, {
                signal
            }), ()=>[]);
    }
    async createUser(input) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])("/api/v2/identity/users", __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["userResponseSchema"], {
            method: "POST",
            body: {
                userName: input.userName,
                email: input.email,
                displayName: input.displayName,
                password: input.password,
                roles: input.roles
            }
        });
    }
    async listSubnets(signal) {
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])("/api/v2/infrastructure/subnets", subnetsSchema, {
                signal
            }), ()=>[]);
    }
    async listFeedSources(signal) {
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])("/api/v2/iocs/feed-sources", __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].array(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["feedSourceResponseSchema"]), {
                signal
            }), ()=>[]);
    }
    async listIocs(query = {}, signal) {
        const params = new URLSearchParams();
        if (query.q) {
            params.set("q", query.q);
        }
        if (query.severity) {
            params.set("severity", query.severity);
        }
        if (query.type) {
            params.set("type", query.type);
        }
        if (query.source) {
            params.set("source", query.source);
        }
        if (query.feedSourceId) {
            params.set("feedSourceId", query.feedSourceId);
        }
        if (query.fromUtc) {
            params.set("fromUtc", query.fromUtc);
        }
        if (query.toUtc) {
            params.set("toUtc", query.toUtc);
        }
        if (typeof query.page === "number") {
            params.set("page", String(query.page));
        }
        if (typeof query.pageSize === "number") {
            params.set("pageSize", String(query.pageSize));
        }
        const suffix = params.size > 0 ? `?${params.toString()}` : "";
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/iocs${suffix}`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["iocListResponseSchema"], {
                signal
            }), ()=>emptyPagedItems(query.page, query.pageSize));
    }
    async listTargetServers(subnetId, signal) {
        const params = new URLSearchParams();
        if (subnetId) {
            params.set("subnetId", subnetId);
        }
        const suffix = params.size > 0 ? `?${params.toString()}` : "";
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/infrastructure/target-servers${suffix}`, targetServersSchema, {
                signal
            }), ()=>[]);
    }
    async listTargetGroups(signal) {
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])("/api/v2/infrastructure/target-groups", targetGroupsSchema, {
                signal
            }), ()=>[]);
    }
    async listTargetGroupMembers(targetGroupId, signal) {
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/infrastructure/target-groups/${targetGroupId}/members`, targetGroupMembersSchema, {
                signal
            }), ()=>[]);
    }
    async listDistributionJobs(filters = {}, signal) {
        const params = new URLSearchParams();
        if (filters.status) {
            params.set("status", filters.status);
        }
        if (filters.operatorUserId) {
            params.set("operatorUserId", filters.operatorUserId);
        }
        if (filters.ruleRevisionId) {
            params.set("ruleRevisionId", filters.ruleRevisionId);
        }
        if (filters.ruleFamily) {
            params.set("ruleFamily", filters.ruleFamily);
        }
        if (filters.targetServerId) {
            params.set("targetServerId", filters.targetServerId);
        }
        if (filters.targetGroupId) {
            params.set("targetGroupId", filters.targetGroupId);
        }
        if (filters.queuedFromUtc) {
            params.set("queuedFromUtc", filters.queuedFromUtc);
        }
        if (filters.queuedToUtc) {
            params.set("queuedToUtc", filters.queuedToUtc);
        }
        if (typeof filters.take === "number") {
            params.set("take", String(filters.take));
        }
        const suffix = params.size > 0 ? `?${params.toString()}` : "";
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/rules/distribution-jobs${suffix}`, ruleDistributionJobsSchema, {
                signal
            }), ()=>[]);
    }
    async getDistributionJob(jobId, signal) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/rules/distribution-jobs/${jobId}`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ruleDistributionJobResponseSchema"], {
            signal
        });
    }
    async listDistributionJobAttempts(jobId, signal) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/rules/distribution-jobs/${jobId}/attempts`, ruleDistributionAttemptsSchema, {
            signal
        });
    }
    async listDistributionJobTargets(jobId, signal) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/rules/distribution-jobs/${jobId}/targets`, ruleDistributionTargetsSchema, {
            signal
        });
    }
    async createDistributionJob(input) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])("/api/v2/rules/distribution-jobs", __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ruleDistributionJobResponseSchema"], {
            method: "POST",
            body: {
                ruleRevisionId: input.ruleRevisionId,
                targetServerIds: input.targetServerIds,
                targetGroupIds: input.targetGroupIds,
                operatorUserId: input.operatorUserId,
                notes: input.notes ?? null,
                maxAttempts: input.maxAttempts ?? null
            }
        });
    }
    async retryDistributionJob(jobId, input) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/rules/distribution-jobs/${jobId}/retry`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ruleDistributionJobResponseSchema"], {
            method: "POST",
            body: {
                actorUserId: input.actorUserId,
                notes: input.notes ?? null
            }
        });
    }
    async listScanPlans(signal) {
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])("/api/v2/scanning/plans", scanPlansSchema, {
                signal
            }), ()=>[]);
    }
    async getScanPlan(scanPlanId, signal) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/scanning/plans/${scanPlanId}`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scanPlanResponseSchema"], {
            signal
        });
    }
    async createScanPlan(input) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])("/api/v2/scanning/plans", __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scanPlanResponseSchema"], {
            method: "POST",
            body: {
                name: input.name,
                description: input.description,
                scannerCapability: input.scannerCapability,
                ruleSelectionMode: input.ruleSelectionMode,
                ruleScopeType: input.ruleScopeType ?? null,
                ruleScopeValue: input.ruleScopeValue ?? null,
                cadenceType: input.cadenceType,
                intervalMinutes: input.intervalMinutes ?? null,
                runAtHourUtc: input.runAtHourUtc ?? null,
                runAtMinuteUtc: input.runAtMinuteUtc ?? null,
                weeklyDayOfWeek: input.weeklyDayOfWeek ?? null,
                operatorNotes: input.operatorNotes ?? null,
                status: input.status ?? null,
                actorUserId: input.actorUserId,
                targetServerIds: input.targetServerIds,
                ruleRevisionIds: input.ruleRevisionIds
            }
        });
    }
    async updateScanPlan(scanPlanId, input) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/scanning/plans/${scanPlanId}`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scanPlanResponseSchema"], {
            method: "PUT",
            body: {
                name: input.name,
                description: input.description,
                scannerCapability: input.scannerCapability,
                ruleSelectionMode: input.ruleSelectionMode,
                ruleScopeType: input.ruleScopeType ?? null,
                ruleScopeValue: input.ruleScopeValue ?? null,
                cadenceType: input.cadenceType,
                intervalMinutes: input.intervalMinutes ?? null,
                runAtHourUtc: input.runAtHourUtc ?? null,
                runAtMinuteUtc: input.runAtMinuteUtc ?? null,
                weeklyDayOfWeek: input.weeklyDayOfWeek ?? null,
                operatorNotes: input.operatorNotes ?? null,
                status: input.status,
                actorUserId: input.actorUserId,
                targetServerIds: input.targetServerIds,
                ruleRevisionIds: input.ruleRevisionIds
            }
        });
    }
    async runScanPlan(scanPlanId, actorUserId, triggerSource) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/scanning/plans/${scanPlanId}/run`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scanJobResponseSchema"], {
            method: "POST",
            body: {
                actorUserId,
                triggerSource: triggerSource ?? "Manual"
            }
        });
    }
    async listScanJobs(filters = {}, signal) {
        const params = new URLSearchParams();
        if (filters.scanPlanId) {
            params.set("scanPlanId", filters.scanPlanId);
        }
        if (filters.status) {
            params.set("status", filters.status);
        }
        if (filters.queuedFromUtc) {
            params.set("queuedFromUtc", filters.queuedFromUtc);
        }
        if (filters.queuedToUtc) {
            params.set("queuedToUtc", filters.queuedToUtc);
        }
        if (typeof filters.take === "number") {
            params.set("take", String(filters.take));
        }
        const suffix = params.size > 0 ? `?${params.toString()}` : "";
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/scanning/jobs${suffix}`, scanJobsSchema, {
                signal
            }), ()=>[]);
    }
    async getScanJob(scanJobId, signal) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/scanning/jobs/${scanJobId}`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scanJobResponseSchema"], {
            signal
        });
    }
    async listScanJobTargets(scanJobId, signal) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/scanning/jobs/${scanJobId}/targets`, scanJobTargetsSchema, {
            signal
        });
    }
    async cancelScanJob(scanJobId, actorUserId, reason) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/scanning/jobs/${scanJobId}/cancel`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["scanJobResponseSchema"], {
            method: "POST",
            body: {
                actorUserId,
                reason: reason ?? null
            }
        });
    }
    async listManagedServers(filters = {}, signal) {
        const params = new URLSearchParams();
        if (filters.q) {
            params.set("q", filters.q);
        }
        if (filters.status) {
            params.set("status", filters.status);
        }
        if (filters.scannerCapability) {
            params.set("scannerCapability", filters.scannerCapability);
        }
        if (filters.subnetId) {
            params.set("subnetId", filters.subnetId);
        }
        if (filters.lastContact) {
            params.set("lastContact", filters.lastContact);
        }
        if (filters.environment) {
            params.set("environment", filters.environment);
        }
        if (filters.fromUtc) {
            params.set("fromUtc", filters.fromUtc);
        }
        if (filters.toUtc) {
            params.set("toUtc", filters.toUtc);
        }
        if (typeof filters.page === "number") {
            params.set("page", String(filters.page));
        }
        if (typeof filters.pageSize === "number") {
            params.set("pageSize", String(filters.pageSize));
        }
        const suffix = params.size > 0 ? `?${params.toString()}` : "";
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/infrastructure/managed-servers${suffix}`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["managedServerInventoryResponseSchema"], {
                signal
            }), ()=>({
                servers: [],
                totalServers: 0,
                unhealthyServers: 0,
                unreachableServers: 0,
                staleContactServers: 0,
                page: resolvePage(filters.page),
                pageSize: resolvePageSize(filters.pageSize)
            }));
    }
    async getManagedServer(targetServerId, signal) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/infrastructure/managed-servers/${targetServerId}`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["managedServerResponseSchema"], {
            signal
        });
    }
    async createManagedServer(input) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])("/api/v2/infrastructure/managed-servers", __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["managedServerResponseSchema"], {
            method: "POST",
            body: {
                subnetId: input.subnetId,
                hostname: input.hostname,
                ipAddress: input.ipAddress,
                operatingSystem: input.operatingSystem,
                environment: input.environment,
                actorUserId: input.actorUserId,
                status: input.status ?? null,
                connectivityStatus: input.connectivityStatus ?? null,
                connectionProtocol: input.connectionProtocol ?? null,
                connectionHost: input.connectionHost ?? null,
                connectionPort: input.connectionPort ?? null,
                connectionAuthMode: input.connectionAuthMode ?? null,
                connectionUsername: input.connectionUsername ?? null
            }
        });
    }
    async updateManagedServer(targetServerId, input) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/infrastructure/managed-servers/${targetServerId}`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["managedServerResponseSchema"], {
            method: "PUT",
            body: {
                hostname: input.hostname,
                ipAddress: input.ipAddress,
                operatingSystem: input.operatingSystem,
                environment: input.environment,
                actorUserId: input.actorUserId,
                status: input.status ?? null,
                connectivityStatus: input.connectivityStatus ?? null,
                connectionProtocol: input.connectionProtocol ?? null,
                connectionHost: input.connectionHost ?? null,
                connectionPort: input.connectionPort ?? null,
                connectionAuthMode: input.connectionAuthMode ?? null,
                connectionUsername: input.connectionUsername ?? null
            }
        });
    }
    async rotateManagedServerConnectionSecret(targetServerId, input) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/infrastructure/managed-servers/${targetServerId}/connection-secret`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["managedServerConnectionSecretMetadataResponseSchema"], {
            method: "POST",
            body: {
                secretPayload: input.secretPayload,
                actorUserId: input.actorUserId
            }
        });
    }
    async upsertManagedServerScannerAssignment(targetServerId, scannerId, input) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/infrastructure/managed-servers/${targetServerId}/scanner-assignments/${scannerId}`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["managedServerScannerAssignmentResponseSchema"], {
            method: "PUT",
            body: {
                connectivityStatus: input.connectivityStatus,
                lastHeartbeatUtc: input.lastHeartbeatUtc ?? null,
                lastContactUtc: input.lastContactUtc ?? null,
                isEnabled: input.isEnabled,
                actorUserId: input.actorUserId
            }
        });
    }
    async removeManagedServerScannerAssignment(targetServerId, scannerId) {
        await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/infrastructure/managed-servers/${targetServerId}/scanner-assignments/${scannerId}`, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v4$2f$classic$2f$external$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].null(), {
            method: "DELETE"
        });
    }
    async listScanners(signal) {
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])("/api/v2/infrastructure/scanners", scannersSchema, {
                signal
            }), ()=>[]);
    }
    async queueDiscoveryRun(input) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])("/api/v2/infrastructure/discovery/runs", __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["discoveryRunResponseSchema"], {
            method: "POST",
            body: {
                subnetId: input.subnetId,
                actorUserId: input.actorUserId,
                rangeStartIp: input.rangeStartIp ?? null,
                rangeEndIp: input.rangeEndIp ?? null
            }
        });
    }
    async listDiscoveryRuns(subnetId, signal) {
        const params = new URLSearchParams();
        if (subnetId) {
            params.set("subnetId", subnetId);
        }
        const suffix = params.size > 0 ? `?${params.toString()}` : "";
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/infrastructure/discovery/runs${suffix}`, discoveryRunsSchema, {
                signal
            }), ()=>[]);
    }
    async listDiscoveredHosts(subnetId, signal) {
        const params = new URLSearchParams();
        if (subnetId) {
            params.set("subnetId", subnetId);
        }
        const suffix = params.size > 0 ? `?${params.toString()}` : "";
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/infrastructure/discovered-hosts${suffix}`, discoveredHostsSchema, {
                signal
            }), ()=>[]);
    }
    async promoteDiscoveredHost(discoveredHostId, input) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/infrastructure/discovered-hosts/${discoveredHostId}/promote`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["promoteDiscoveredHostResponseSchema"], {
            method: "POST",
            body: {
                hostname: input.hostname,
                operatingSystem: input.operatingSystem,
                environment: input.environment,
                actorUserId: input.actorUserId
            }
        });
    }
    async listDetections(query = {}, signal) {
        const params = new URLSearchParams();
        if (query.q) {
            params.set("q", query.q);
        }
        if (query.family) {
            params.set("family", query.family);
        }
        if (query.status) {
            params.set("status", query.status);
        }
        if (query.source) {
            params.set("source", query.source);
        }
        if (query.serverId) {
            params.set("serverId", query.serverId);
        }
        if (query.iocId) {
            params.set("iocId", query.iocId);
        }
        if (query.ruleRevisionId) {
            params.set("ruleRevisionId", query.ruleRevisionId);
        }
        if (query.scanJobId) {
            params.set("scanJobId", query.scanJobId);
        }
        if (query.fromUtc) {
            params.set("fromUtc", query.fromUtc);
        }
        if (query.toUtc) {
            params.set("toUtc", query.toUtc);
        }
        if (query.includeProvenance) {
            params.set("includeProvenance", "true");
        }
        if (typeof query.page === "number") {
            params.set("page", String(query.page));
        }
        if (typeof query.pageSize === "number") {
            params.set("pageSize", String(query.pageSize));
        }
        if (query.sort) {
            params.set("sort", query.sort);
        }
        const suffix = params.size > 0 ? `?${params.toString()}` : "";
        return withLegacyEmptyFallback(()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/v2/scanning/results${suffix}`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["detectionHistoryResponseSchema"], {
                signal
            }), ()=>{
            const page = resolvePage(query.page);
            const pageSize = resolvePageSize(query.pageSize);
            return {
                total: 0,
                take: pageSize,
                skip: (page - 1) * pageSize,
                items: []
            };
        });
    }
    async getHealthInfo(signal) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])("/api/health/info", __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["healthInfoSchema"], {
            signal
        });
    }
    async getHealthReady(signal) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])("/health/ready", __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["healthReadySchema"], {
            signal
        });
    }
    async getHealthAdmin(signal) {
        try {
            return await (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])("/api/health/admin", __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["healthAdminSchema"], {
                signal
            });
        } catch (error) {
            if (error instanceof __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ApiError"] && (error.status === 401 || error.status === 403)) {
                return null;
            }
            throw error;
        }
    }
    async getCaseRuleWorkflow(caseId, signal) {
        return this.getAlertRuleWorkflow(caseId, signal);
    }
    async getAlertRuleWorkflow(alertId, signal) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/rule-workflow/alerts/${alertId}`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["alertRuleWorkflowResponseSchema"], {
            signal
        });
    }
    async createRuleProposal(input) {
        const alertId = input.alertId ?? input.caseId;
        if (!alertId) {
            throw new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$error$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ApiError"]("Rule proposal creation requires alertId.", 400);
        }
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])("/api/rule-workflow/proposals", __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ruleProposalResponseSchema"], {
            method: "POST",
            body: {
                alertId,
                caseId: input.caseId ?? alertId,
                proposalName: input.proposalName,
                ruleFamily: input.ruleFamily,
                ruleBody: input.ruleBody,
                proposedVersion: input.proposedVersion,
                proposedByUserId: input.proposedByUserId,
                rationale: input.rationale,
                policyRiskScore: input.policyRiskScore
            }
        });
    }
    async reviewRuleProposal(proposalId, input) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/rule-workflow/proposals/${proposalId}/review`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ruleProposalResponseSchema"], {
            method: "PATCH",
            body: {
                decision: input.decision,
                reviewerUserId: input.reviewerUserId,
                reviewReason: input.reviewReason,
                overrideReason: input.overrideReason
            }
        });
    }
    async simulateRuleProposal(proposalId, input) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/rule-workflow/proposals/${proposalId}/simulate`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ruleSimulationResultResponseSchema"], {
            method: "POST",
            body: {
                targetEnvironment: input.targetEnvironment,
                actorUserId: input.actorUserId,
                notes: input.notes
            }
        });
    }
    async advanceRolloutStage(rolloutPlanId, input) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/rule-workflow/rollouts/${rolloutPlanId}/stage`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["rolloutPlanResponseSchema"], {
            method: "PATCH",
            body: {
                stage: input.stage,
                actorUserId: input.actorUserId,
                reason: input.reason,
                overrideReason: input.overrideReason
            }
        });
    }
    async recordCanaryObservation(rolloutPlanId, input) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/rule-workflow/rollouts/${rolloutPlanId}/canary-observation`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["rolloutPlanResponseSchema"], {
            method: "PATCH",
            body: {
                observedNoise: input.observedNoise,
                analystAcceptedCount: input.analystAcceptedCount,
                analystReviewedCount: input.analystReviewedCount,
                actorUserId: input.actorUserId
            }
        });
    }
    async triggerRollback(rollbackPlanId, input) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/rule-workflow/rollbacks/${rollbackPlanId}/trigger`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["rollbackPlanResponseSchema"], {
            method: "POST",
            body: {
                actorUserId: input.actorUserId,
                reason: input.reason,
                observedNoise: input.observedNoise
            }
        });
    }
    async getCoveragePainAnalysis(input = {
        scopeType: "entire-environment"
    }, signal) {
        const params = new URLSearchParams();
        params.set("scopeType", input.scopeType);
        if (input.scopeValue) {
            params.set("scopeValue", input.scopeValue);
        }
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])(`/api/reporting/analysis?${params.toString()}`, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["coveragePainAnalysisResponseSchema"], {
            signal
        });
    }
    async runModelRetraining(triggeredByUserId) {
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$client$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["requestJson"])("/api/admin/jobs/model-retraining", __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$api$2f$schemas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jobRunResponseSchema"], {
            method: "POST",
            body: {
                triggeredByUserId
            }
        });
    }
    // Aggregated admin settings surface retained for shared admin compatibility.
    async getSettingsAdmin(signal) {
        const [healthInfo, healthAdmin, recentJobs] = await Promise.all([
            this.getHealthInfo(signal),
            this.getHealthAdmin(signal),
            this.listJobRuns(signal)
        ]);
        return {
            healthInfo,
            healthAdmin,
            recentJobs
        };
    }
    // Expose list helpers for aggregated views that combine rule workflow entities across cases.
    async listAllRecommendations(signal) {
        const alerts = await this.listAlerts(signal);
        const responses = await Promise.allSettled(alerts.map((item)=>this.getAlertRuleWorkflow(item.id, signal)));
        const merged = responses.flatMap((result)=>result.status === "fulfilled" ? result.value.recommendations : []);
        return recommendationsSchema.parse(merged);
    }
    async listAllRollouts(signal) {
        const alerts = await this.listAlerts(signal);
        const responses = await Promise.allSettled(alerts.map((item)=>this.getAlertRuleWorkflow(item.id, signal)));
        const merged = responses.flatMap((result)=>result.status === "fulfilled" ? result.value.rolloutPlans : []);
        return rolloutsSchema.parse(merged);
    }
    async listAllRollbacks(signal) {
        const alerts = await this.listAlerts(signal);
        const responses = await Promise.allSettled(alerts.map((item)=>this.getAlertRuleWorkflow(item.id, signal)));
        const merged = responses.flatMap((result)=>result.status === "fulfilled" ? result.value.rollbackPlans : []);
        return rollbacksSchema.parse(merged);
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/shared/gateway/adapters.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "buildActivityTimeline",
    ()=>buildActivityTimeline,
    "buildGraphInvestigation",
    ()=>buildGraphInvestigation,
    "buildGraphNeighbors",
    ()=>buildGraphNeighbors,
    "buildLinkedReports",
    ()=>buildLinkedReports,
    "buildLinkedRules",
    ()=>buildLinkedRules,
    "buildNextBestEvidence",
    ()=>buildNextBestEvidence,
    "buildPolicyGuardrails",
    ()=>buildPolicyGuardrails,
    "buildQueue",
    ()=>buildQueue,
    "buildReportsIngestion",
    ()=>buildReportsIngestion,
    "buildScoreAxes",
    ()=>buildScoreAxes,
    "buildSimilarHistoricalCases",
    ()=>buildSimilarHistoricalCases,
    "buildTopEvidence",
    ()=>buildTopEvidence,
    "synthesizeRollbackPlan",
    ()=>synthesizeRollbackPlan,
    "synthesizeRolloutPlan",
    ()=>synthesizeRolloutPlan
]);
function seedFromString(input) {
    let hash = 2166136261;
    for(let index = 0; index < input.length; index += 1){
        hash ^= input.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}
function mulberry32(seed) {
    let value = seed;
    return ()=>{
        value += 0x6d2b79f5;
        let next = Math.imul(value ^ value >>> 15, 1 | value);
        next ^= next + Math.imul(next ^ next >>> 7, 61 | next);
        return ((next ^ next >>> 14) >>> 0) / 4294967296;
    };
}
function numberInRange(random, min, max) {
    return Math.round(min + random() * (max - min));
}
function clamp(value, min = 0, max = 100) {
    return Math.min(max, Math.max(min, Math.round(value)));
}
function normalize(value) {
    return value.replace(/\s|_|-/g, "").toLowerCase();
}
function normalizeAction(action) {
    return action.replace(/_/g, " ");
}
function latestByUpdatedAt(items) {
    return items.slice().sort((left, right)=>Date.parse(right.updatedAtUtc) - Date.parse(left.updatedAtUtc))[0] ?? null;
}
function latestByTimestamp(items) {
    return items.slice().sort((left, right)=>Date.parse(right.collectedAtUtc) - Date.parse(left.collectedAtUtc))[0] ?? null;
}
function buildScoreAxes(caseId, evidence, decisions) {
    const random = mulberry32(seedFromString(caseId));
    const evidenceConfidence = evidence.length > 0 ? evidence.reduce((sum, item)=>sum + item.confidence, 0) / evidence.length : 0.5;
    const decisionStrength = decisions.length > 0 ? Math.min(0.95, 0.55 + decisions.length * 0.08) : 0.4;
    return [
        {
            axis: "Maliciousness",
            value: numberInRange(random, 45, 92),
            max: 100
        },
        {
            axis: "Uncertainty",
            value: numberInRange(random, 12, 67),
            max: 100
        },
        {
            axis: "Blast Radius",
            value: numberInRange(random, 18, 88),
            max: 100
        },
        {
            axis: "Evidence Completeness",
            value: Math.round(Math.min(100, evidenceConfidence * 100)),
            max: 100
        },
        {
            axis: "Actionability",
            value: Math.round(Math.min(100, decisionStrength * 100)),
            max: 100
        }
    ];
}
function buildGraphNeighbors(caseId, count = 5) {
    const random = mulberry32(seedFromString(`${caseId}:neighbors`));
    const relations = [
        "co-observed",
        "lineage-parent",
        "lineage-child",
        "same-campaign",
        "shared-infrastructure"
    ];
    const labels = [
        "Domain Cluster",
        "Beaconing Endpoint",
        "Credential Artifact",
        "Operator Tooling Node",
        "C2 Infrastructure",
        "Phishing Sender Profile",
        "Lateral Movement Host",
        "Malware Lineage"
    ];
    return Array.from({
        length: count
    }).map((_, index)=>{
        const confidence = numberInRange(random, 48, 92);
        return {
            id: `${caseId}-neighbor-${index + 1}`,
            label: `${labels[index % labels.length]} ${index + 1}`,
            relationship: relations[index % relations.length],
            confidence
        };
    });
}
function hoursAgo(referenceUtc, hours) {
    return new Date(Date.parse(referenceUtc) - hours * 60 * 60 * 1000).toISOString();
}
function summarizeEvidenceSources(evidence) {
    const sources = Array.from(new Set(evidence.map((item)=>item.sourceSystem))).slice(0, 3);
    return sources.length > 0 ? sources : [
        "EDR",
        "DNS",
        "SIEM"
    ];
}
function nodeId(caseId, key) {
    return `${caseId}:${key}`;
}
function randomEntityConfidence(random) {
    return numberInRange(random, 58, 95);
}
function buildGraphInvestigation(caseItem, evidence, rules, allCases) {
    const caseId = caseItem.id;
    const random = mulberry32(seedFromString(`${caseId}:investigation-graph`));
    const evidenceSources = summarizeEvidenceSources(evidence);
    const relatedCases = allCases.filter((item)=>item.id !== caseId).slice(0, 3);
    const relatedRules = rules.slice(0, 3).map((item)=>({
            id: item.id,
            name: item.name,
            status: item.status
        }));
    const referenceUtc = caseItem.updatedAtUtc;
    const entities = [
        {
            key: "identity",
            label: `Identity ${caseId.slice(0, 6)}`,
            entityType: "identity",
            metadata: {
                principal: `svc-${caseId.slice(0, 6)}`,
                role: "Privileged service account"
            }
        },
        {
            key: "host",
            label: "Lateral Host",
            entityType: "host",
            metadata: {
                hostname: `wkstn-${caseId.slice(0, 4)}`,
                segment: "Finance-Prod"
            }
        },
        {
            key: "domain",
            label: "Beacon Domain",
            entityType: "domain",
            metadata: {
                fqdn: `update-${caseId.slice(0, 5)}.infra-sync.net`,
                registrar: "Recently registered"
            }
        },
        {
            key: "ip",
            label: "C2 Endpoint",
            entityType: "ip",
            metadata: {
                address: `198.51.100.${numberInRange(random, 11, 219)}`,
                asn: `AS${numberInRange(random, 64000, 64800)}`
            }
        },
        {
            key: "malware",
            label: "Payload Family",
            entityType: "malware",
            metadata: {
                family: "Loader.Greyline",
                lineage: "Variant B"
            }
        },
        {
            key: "tool",
            label: "Operator Tooling",
            entityType: "tool",
            metadata: {
                toolset: "Credential dumper",
                execution: "Living-off-the-land"
            }
        },
        {
            key: "artifact",
            label: "Credential Artifact",
            entityType: "artifact",
            metadata: {
                hash: evidence[0]?.contentHash.slice(0, 16) ?? "unknown-hash",
                source: evidence[0]?.sourceSystem ?? "EDR"
            }
        }
    ];
    const nodes = [
        {
            id: caseId,
            label: caseItem.title,
            entityType: "case",
            confidence: 100,
            metadata: {
                priority: caseItem.priority,
                status: caseItem.status,
                owner: caseItem.ownerUserId,
                approvalTier: caseItem.approvalTierRequired
            },
            provenance: [
                "Case registry",
                "Policy engine timeline"
            ],
            sightings: [
                {
                    source: "Case timeline",
                    firstSeenUtc: caseItem.createdAtUtc,
                    lastSeenUtc: caseItem.updatedAtUtc,
                    count: 1
                }
            ],
            linkedCases: relatedCases.map((item)=>({
                    caseId: item.id,
                    title: item.title,
                    status: item.status
                })),
            relatedRules
        },
        ...entities.map((entity, index)=>{
            const firstSeenOffsetHours = numberInRange(random, 36 + index * 3, 240 + index * 8);
            const lastSeenOffsetHours = Math.max(1, numberInRange(random, 2, 24 + index * 2));
            const firstSeenUtc = hoursAgo(referenceUtc, firstSeenOffsetHours);
            const lastSeenUtc = hoursAgo(referenceUtc, lastSeenOffsetHours);
            const sourceA = evidenceSources[index % evidenceSources.length];
            const sourceB = evidenceSources[(index + 1) % evidenceSources.length];
            return {
                id: nodeId(caseId, entity.key),
                label: entity.label,
                entityType: entity.entityType,
                confidence: randomEntityConfidence(random),
                metadata: entity.metadata,
                provenance: [
                    `${sourceA} correlated telemetry`,
                    "Analyst-reviewed linkage"
                ],
                sightings: [
                    {
                        source: sourceA,
                        firstSeenUtc,
                        lastSeenUtc,
                        count: numberInRange(random, 2, 14)
                    },
                    {
                        source: sourceB,
                        firstSeenUtc: hoursAgo(referenceUtc, firstSeenOffsetHours + numberInRange(random, 2, 24)),
                        lastSeenUtc,
                        count: numberInRange(random, 1, 8)
                    }
                ],
                linkedCases: relatedCases.slice(0, 2).map((item)=>({
                        caseId: item.id,
                        title: item.title,
                        status: item.status
                    })),
                relatedRules
            };
        })
    ];
    const edges = [
        {
            id: `${caseId}:edge:case-identity`,
            source: caseId,
            target: nodeId(caseId, "identity"),
            edgeType: "related-case",
            semantic: "Identity appeared in adjacent investigation cases.",
            confidence: numberInRange(random, 62, 92),
            firstSeenUtc: hoursAgo(referenceUtc, 192),
            lastSeenUtc: hoursAgo(referenceUtc, 8)
        },
        {
            id: `${caseId}:edge:identity-host`,
            source: nodeId(caseId, "identity"),
            target: nodeId(caseId, "host"),
            edgeType: "authenticates-to",
            semantic: "Service account authenticated to host during suspicious window.",
            confidence: numberInRange(random, 66, 94),
            firstSeenUtc: hoursAgo(referenceUtc, 164),
            lastSeenUtc: hoursAgo(referenceUtc, 4)
        },
        {
            id: `${caseId}:edge:host-domain`,
            source: nodeId(caseId, "host"),
            target: nodeId(caseId, "domain"),
            edgeType: "communicates-with",
            semantic: "Host repeatedly beaconed to rare domain.",
            confidence: numberInRange(random, 58, 89),
            firstSeenUtc: hoursAgo(referenceUtc, 150),
            lastSeenUtc: hoursAgo(referenceUtc, 2)
        },
        {
            id: `${caseId}:edge:domain-ip`,
            source: nodeId(caseId, "domain"),
            target: nodeId(caseId, "ip"),
            edgeType: "resolves-to",
            semantic: "Domain resolved to rotating endpoint set.",
            confidence: numberInRange(random, 71, 96),
            firstSeenUtc: hoursAgo(referenceUtc, 146),
            lastSeenUtc: hoursAgo(referenceUtc, 2)
        },
        {
            id: `${caseId}:edge:artifact-malware`,
            source: nodeId(caseId, "artifact"),
            target: nodeId(caseId, "malware"),
            edgeType: "indicates",
            semantic: "Artifact fingerprint indicates malware lineage.",
            confidence: numberInRange(random, 67, 95),
            firstSeenUtc: hoursAgo(referenceUtc, 136),
            lastSeenUtc: hoursAgo(referenceUtc, 6)
        },
        {
            id: `${caseId}:edge:malware-host`,
            source: nodeId(caseId, "malware"),
            target: nodeId(caseId, "host"),
            edgeType: "observed-on",
            semantic: "Malware execution observed on host with corroborating telemetry.",
            confidence: numberInRange(random, 64, 90),
            firstSeenUtc: hoursAgo(referenceUtc, 132),
            lastSeenUtc: hoursAgo(referenceUtc, 5)
        },
        {
            id: `${caseId}:edge:tool-host`,
            source: nodeId(caseId, "tool"),
            target: nodeId(caseId, "host"),
            edgeType: "uses",
            semantic: "Operator tooling execution linked to host process chain.",
            confidence: numberInRange(random, 55, 83),
            firstSeenUtc: hoursAgo(referenceUtc, 120),
            lastSeenUtc: hoursAgo(referenceUtc, 3)
        },
        {
            id: `${caseId}:edge:case-artifact`,
            source: caseId,
            target: nodeId(caseId, "artifact"),
            edgeType: "delivers",
            semantic: "Case evidence package contains artifact sample.",
            confidence: numberInRange(random, 62, 88),
            firstSeenUtc: hoursAgo(referenceUtc, 126),
            lastSeenUtc: hoursAgo(referenceUtc, 7)
        },
        {
            id: `${caseId}:edge:case-domain`,
            source: caseId,
            target: nodeId(caseId, "domain"),
            edgeType: "related-case",
            semantic: "Domain appears in cross-case pivots relevant to this case.",
            confidence: numberInRange(random, 59, 87),
            firstSeenUtc: hoursAgo(referenceUtc, 174),
            lastSeenUtc: hoursAgo(referenceUtc, 8)
        }
    ];
    const pathHints = [
        {
            id: `${caseId}:path:credential-lateral`,
            title: "Credential to Lateral Movement",
            description: "Track suspect principal to host execution and outbound beacon.",
            nodeIds: [
                caseId,
                nodeId(caseId, "identity"),
                nodeId(caseId, "host"),
                nodeId(caseId, "domain")
            ],
            edgeIds: [
                `${caseId}:edge:case-identity`,
                `${caseId}:edge:identity-host`,
                `${caseId}:edge:host-domain`
            ],
            relevanceScore: 93
        },
        {
            id: `${caseId}:path:delivery-c2`,
            title: "Artifact to C2 Infrastructure",
            description: "Follow evidence artifact lineage toward active C2 endpoint.",
            nodeIds: [
                caseId,
                nodeId(caseId, "artifact"),
                nodeId(caseId, "malware"),
                nodeId(caseId, "domain"),
                nodeId(caseId, "ip")
            ],
            edgeIds: [
                `${caseId}:edge:case-artifact`,
                `${caseId}:edge:artifact-malware`,
                `${caseId}:edge:malware-host`,
                `${caseId}:edge:host-domain`,
                `${caseId}:edge:domain-ip`
            ],
            relevanceScore: 87
        }
    ];
    const allTimes = [
        ...edges.flatMap((edge)=>[
                Date.parse(edge.firstSeenUtc),
                Date.parse(edge.lastSeenUtc)
            ]),
        ...nodes.flatMap((node)=>node.sightings.flatMap((sighting)=>[
                    Date.parse(sighting.firstSeenUtc),
                    Date.parse(sighting.lastSeenUtc)
                ]))
    ].filter((value)=>Number.isFinite(value));
    const start = Math.min(...allTimes);
    const end = Math.max(...allTimes);
    return {
        nodes,
        edges,
        pathHints,
        timeBounds: {
            startUtc: new Date(start).toISOString(),
            endUtc: new Date(end).toISOString()
        }
    };
}
function buildSimilarHistoricalCases(caseId) {
    const random = mulberry32(seedFromString(`${caseId}:similar`));
    const names = [
        "Credential Replay Across Finance Segment",
        "DNS Exfiltration Through Newly Registered Domain",
        "Privilege Escalation via Scripted Task Chain"
    ];
    return Array.from({
        length: 3
    }).map((_, index)=>({
            caseId: `hist-${caseId.slice(0, 6)}-${index + 1}`,
            title: names[index % names.length],
            outcome: index % 2 === 0 ? "Promoted" : "Contained",
            similarity: numberInRange(random, 62, 94)
        }));
}
function buildNextBestEvidence(caseId) {
    const random = mulberry32(seedFromString(`${caseId}:nbe`));
    const hints = [
        "Endpoint process tree for first execution timestamp",
        "Passive DNS history for linked domain",
        "EDR prevalence pivot across peer hosts",
        "Email telemetry for related sender infrastructure"
    ];
    return hints.slice(0, 3).map((label, index)=>({
            id: `${caseId}-hint-${index + 1}`,
            label,
            reason: `Expected policy confidence uplift ${numberInRange(random, 8, 22)}%`,
            sourceHint: index % 2 === 0 ? "EDR + DNS" : "SIEM + Email"
        }));
}
function feedbackSignal(feedback) {
    if (feedback.length === 0) {
        return "No analyst feedback yet";
    }
    const supportive = feedback.filter((item)=>normalize(item.verdict).includes("accept") || normalize(item.verdict).includes("approve")).length;
    const dissenting = feedback.filter((item)=>normalize(item.verdict).includes("reject")).length;
    return `${supportive} supportive / ${dissenting} dissenting verdicts`;
}
function buildLinkedReports(evidence, feedback) {
    if (evidence.length === 0) {
        return [];
    }
    const grouped = new Map();
    for (const item of evidence){
        grouped.set(item.sourceSystem, [
            ...grouped.get(item.sourceSystem) ?? [],
            item
        ]);
    }
    return Array.from(grouped.entries()).map(([sourceSystem, items], index)=>{
        const latest = latestByTimestamp(items);
        const avgConfidence = items.reduce((sum, item)=>sum + item.confidence, 0) / items.length;
        const reportTitle = `${sourceSystem} intelligence report`;
        return {
            id: `${normalize(sourceSystem)}-report-${index + 1}`,
            title: reportTitle,
            sourceSystem,
            summary: `${items.length} evidence item(s), top hash ${latest?.contentHash.slice(0, 10) ?? "unknown"}`,
            confidence: Number.parseFloat(avgConfidence.toFixed(3)),
            collectedAtUtc: latest?.collectedAtUtc ?? new Date(0).toISOString(),
            contentHash: latest?.contentHash ?? "n/a",
            feedbackSignal: feedbackSignal(feedback)
        };
    }).sort((left, right)=>Date.parse(right.collectedAtUtc) - Date.parse(left.collectedAtUtc)).slice(0, 6);
}
function buildActivityTimeline(decisions, deployments, feedback) {
    const decisionEvents = decisions.map((item)=>({
            id: `decision-${item.id}`,
            title: `Decision ${item.state}`,
            detail: `${normalizeAction(item.recommendedAction)} · policy ${item.policyVersion}`,
            when: item.updatedAtUtc,
            tone: normalize(item.state).includes("approved") ? "success" : normalize(item.state).includes("reject") ? "warning" : "default",
            source: "decision"
        }));
    const deploymentEvents = deployments.map((item)=>({
            id: `deployment-${item.id}`,
            title: `Deployment ${item.status}`,
            detail: `${item.targetEnvironment} · rule ${item.ruleId.slice(0, 8)}`,
            when: item.updatedAtUtc,
            tone: normalize(item.status).includes("rollback") ? "warning" : normalize(item.status).includes("promot") ? "success" : "default",
            source: "deployment"
        }));
    const feedbackEvents = feedback.map((item)=>({
            id: `feedback-${item.id}`,
            title: `Feedback ${item.verdict}`,
            detail: item.notes,
            when: item.submittedAtUtc,
            tone: normalize(item.verdict).includes("reject") ? "warning" : "default",
            source: "feedback"
        }));
    return [
        ...decisionEvents,
        ...deploymentEvents,
        ...feedbackEvents
    ].sort((left, right)=>Date.parse(right.when) - Date.parse(left.when));
}
function buildLinkedRules(rules, workflow) {
    const latestProposalByKey = new Map();
    for (const proposal of workflow?.proposals ?? []){
        const key = `${normalize(proposal.ruleFamily)}:${normalize(proposal.proposedVersion)}`;
        const current = latestProposalByKey.get(key);
        if (!current || Date.parse(proposal.updatedAtUtc) > Date.parse(current.updatedAtUtc)) {
            latestProposalByKey.set(key, proposal);
        }
    }
    return rules.map((rule)=>{
        const key = `${normalize(rule.ruleFamily)}:${normalize(rule.version)}`;
        const matchingProposal = latestProposalByKey.get(key);
        const provenance = matchingProposal ? `Proposal ${matchingProposal.proposalName} (${matchingProposal.status})` : "Existing enforced case rule";
        return {
            id: rule.id,
            name: rule.name,
            family: rule.ruleFamily,
            version: rule.version,
            status: rule.status,
            provenance,
            updatedAtUtc: rule.updatedAtUtc
        };
    }).sort((left, right)=>Date.parse(right.updatedAtUtc) - Date.parse(left.updatedAtUtc));
}
function latestRollout(workflow) {
    if (!workflow || workflow.rolloutPlans.length === 0) {
        return null;
    }
    return latestByUpdatedAt(workflow.rolloutPlans);
}
function linkedRollback(workflow, rollout) {
    if (!workflow || workflow.rollbackPlans.length === 0) {
        return null;
    }
    if (!rollout) {
        return latestByUpdatedAt(workflow.rollbackPlans);
    }
    return workflow.rollbackPlans.find((item)=>item.rolloutPlanId === rollout.id) ?? latestByUpdatedAt(workflow.rollbackPlans);
}
function buildPolicyGuardrails(latestDecision, workflow, latestWorkflowRollout, latestWorkflowRollback, caseItem) {
    const effectiveRollout = latestWorkflowRollout ?? latestRollout(workflow);
    const effectiveRollback = latestWorkflowRollback ?? linkedRollback(workflow, effectiveRollout);
    const effectiveTier = latestDecision?.approvalTierRequired ?? caseItem.approvalTierRequired;
    const allRecommendationsRequireApproval = (workflow?.recommendations ?? []).every((item)=>item.requiresHumanApproval);
    const allRecommendationsAutopublishDisabled = (workflow?.recommendations ?? []).every((item)=>!item.autoPublishEnabled);
    return [
        {
            id: "human-approval",
            label: `Human approval gate (${effectiveTier})`,
            status: "enforced",
            rationale: latestDecision?.approvedByUserId ? `Approved by ${latestDecision.approvedByUserId} at ${new Date(latestDecision.approvedAtUtc ?? latestDecision.updatedAtUtc).toLocaleString()}.` : "Decision cannot be promoted without an approved human reviewer.",
            owner: "Policy engine"
        },
        {
            id: "auto-publish-disabled",
            label: "Auto-publish disabled",
            status: allRecommendationsAutopublishDisabled ? "enforced" : "warning",
            rationale: allRecommendationsAutopublishDisabled ? "All recommendations require explicit analyst/lead action for rollout progression." : "One or more recommendations are missing explicit auto-publish controls.",
            owner: "Deployment controls"
        },
        {
            id: "manual-promotion",
            label: "Manual promotion checkpoints",
            status: effectiveRollout?.requiresManualPromotion || allRecommendationsRequireApproval ? "enforced" : "info",
            rationale: effectiveRollout ? `Current stage ${effectiveRollout.currentStage}; manual promotion required at each stage boundary.` : "No rollout plan is active; manual promotion policy remains in standby.",
            owner: "Rollout policy"
        },
        {
            id: "rollback-threshold",
            label: "Rollback threshold guard",
            status: effectiveRollback?.triggerConditionMet ? "warning" : "enforced",
            rationale: effectiveRollback ? `${effectiveRollback.triggerCondition} (threshold ${(effectiveRollback.predictedNoiseThreshold * 100).toFixed(1)}%).` : "Rollback requires observed noise threshold breach or policy violation override.",
            owner: "Safety controls"
        }
    ];
}
function formatActionSummary(action) {
    if (!action) {
        return "Collect corroborating evidence before escalation.";
    }
    const normalized = action.replace(/_/g, " ").toLowerCase();
    if (normalized.includes("contain")) {
        return "Contain scope and monitor blast radius drift.";
    }
    if (normalized.includes("block")) {
        return "Block indicators and monitor policy side effects.";
    }
    if (normalized.includes("evidence")) {
        return "Gather additional evidence before approval gate.";
    }
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
function detectDecisionState(caseStatus, recommendedAction) {
    const status = normalize(caseStatus);
    const action = normalize(recommendedAction);
    if (status.includes("awaitingapproval")) {
        return "Awaiting Approval";
    }
    if (status.includes("approved")) {
        return "Approved";
    }
    if (status.includes("closed")) {
        return "Closed";
    }
    if (action.includes("contain") || action.includes("block")) {
        return "Ready for Containment";
    }
    return "Investigating";
}
function parsePriorityWeight(priority) {
    const normalized = normalize(priority);
    if (normalized === "critical") {
        return 100;
    }
    if (normalized === "high") {
        return 78;
    }
    if (normalized === "medium") {
        return 56;
    }
    return 34;
}
function parseApprovalTierWeight(approvalTier) {
    const normalized = normalize(approvalTier);
    if (normalized === "admin") {
        return 96;
    }
    if (normalized === "lead") {
        return 78;
    }
    return 55;
}
function formatGraphSummary(caseId, neighbors) {
    if (neighbors.length === 0) {
        return "No graph pivots yet.";
    }
    const relationCounts = neighbors.reduce((accumulator, neighbor)=>{
        const key = neighbor.relationship;
        accumulator[key] = (accumulator[key] ?? 0) + 1;
        return accumulator;
    }, {});
    const [primaryRelation, primaryCount] = Object.entries(relationCounts).sort((left, right)=>right[1] - left[1])[0] ?? [
        "related",
        0
    ];
    const topConfidence = neighbors.reduce((max, neighbor)=>Math.max(max, neighbor.confidence), 0);
    return `${primaryCount} ${primaryRelation} pivots · top confidence ${topConfidence}% · node ${caseId.slice(0, 8)}`;
}
function computeConflictFromEvidence(caseId, evidenceCount) {
    const random = mulberry32(seedFromString(`${caseId}:conflict`));
    if (evidenceCount === 0) {
        return numberInRange(random, 74, 96);
    }
    const baseline = numberInRange(random, 28, 82);
    const volatilityPenalty = numberInRange(random, 0, 12);
    return clamp(baseline + volatilityPenalty - evidenceCount * 4);
}
function computeSlaPressure(updatedAtUtc, priorityWeight, state) {
    const hoursSinceUpdate = Math.max(0, (Date.now() - Date.parse(updatedAtUtc)) / (1000 * 60 * 60));
    const staleness = clamp(hoursSinceUpdate / 72 * 100);
    const stateBoost = normalize(state).includes("awaitingapproval") ? 22 : 0;
    return clamp(staleness * 0.56 + priorityWeight * 0.34 + stateBoost);
}
function computeExpiryUtc(updatedAtUtc, priorityWeight, state) {
    const baseHours = priorityWeight >= 90 ? 4 : priorityWeight >= 70 ? 8 : priorityWeight >= 55 ? 16 : 24;
    const approvalPenalty = normalize(state).includes("awaitingapproval") ? 2 : 0;
    const expiresAt = new Date(Date.parse(updatedAtUtc) + (baseHours - approvalPenalty) * 60 * 60 * 1000);
    return expiresAt.toISOString();
}
function synthesizeRolloutPlan(caseItem, latestDeployment) {
    if (latestDeployment) {
        return `Current status ${latestDeployment.status} in ${latestDeployment.targetEnvironment}. Maintain canary hold for 90 minutes before promotion gate.`;
    }
    return `Begin with shadow rollout for case ${caseItem.id.slice(0, 8)} then progress to canary at 10% scope if analyst acceptance remains above threshold.`;
}
function synthesizeRollbackPlan(caseItem, latestDeployment) {
    if (!latestDeployment) {
        return "Rollback trigger: policy violation or fp delta > 15% sustained for 2h. Restore prior stable rule bundle and notify lead approver.";
    }
    return `If ${latestDeployment.status.toLowerCase()} regresses quality, rollback ${latestDeployment.ruleId.slice(0, 8)} to previous version and freeze promotion for 24h.`;
}
function buildTopEvidence(evidence) {
    return evidence.slice().sort((left, right)=>right.confidence - left.confidence).slice(0, 5).map((item)=>({
            id: item.id,
            evidenceType: item.evidenceType,
            sourceSystem: item.sourceSystem,
            confidence: item.confidence,
            collectedAtUtc: item.collectedAtUtc,
            summary: `${item.evidenceType} from ${item.sourceSystem} at confidence ${Math.round(item.confidence * 100)}%`
        }));
}
function buildQueue(cases, details) {
    const detailById = new Map(details.map((item)=>[
            item.caseItem.id,
            item
        ]));
    return cases.map((item)=>{
        const detail = detailById.get(item.id);
        const uncertainty = detail?.scoreAxes.find((axis)=>axis.axis === "Uncertainty")?.value ?? 50;
        const blastRadius = detail?.scoreAxes.find((axis)=>axis.axis === "Blast Radius")?.value ?? 50;
        const actionability = detail?.scoreAxes.find((axis)=>axis.axis === "Actionability")?.value ?? 45;
        const recommendation = detail?.recommendedAction ?? "request_more_evidence";
        const decisionState = detail?.decisionState ?? detectDecisionState(item.status, recommendation);
        const evidenceConflict = computeConflictFromEvidence(item.id, detail?.topEvidence.length ?? 0);
        const novelty = clamp(100 - (detail?.similarHistoricalCases.reduce((max, similar)=>Math.max(max, similar.similarity), 0) ?? numberInRange(mulberry32(seedFromString(`${item.id}:novelty`)), 45, 80)));
        const priorityWeight = parsePriorityWeight(item.priority);
        const strategicValue = clamp(priorityWeight * 0.42 + parseApprovalTierWeight(detail?.approvalTier ?? item.approvalTierRequired) * 0.58);
        const slaPressure = computeSlaPressure(item.updatedAtUtc, priorityWeight, decisionState);
        const missingEvidence = (detail?.nextBestEvidence ?? []).slice(0, 3).map((hint)=>hint.label);
        const relatedGraphSummary = formatGraphSummary(item.id, detail?.graphNeighbors ?? []);
        const triageScore = clamp(uncertainty * 0.17 + evidenceConflict * 0.16 + novelty * 0.12 + actionability * 0.12 + blastRadius * 0.18 + strategicValue * 0.14 + slaPressure * 0.11);
        return {
            caseId: item.id,
            title: item.title,
            priority: item.priority,
            status: item.status,
            decisionState,
            recommendedAction: recommendation.replace(/_/g, " "),
            uncertainty,
            evidenceConflict,
            novelty,
            actionability,
            blastRadius,
            strategicValue,
            slaPressure,
            missingEvidence,
            relatedGraphSummary,
            expiresAtUtc: computeExpiryUtc(item.updatedAtUtc, priorityWeight, decisionState),
            triageScore,
            policyRisk: triageScore,
            approvalTier: detail?.approvalTier ?? item.approvalTierRequired,
            rolloutState: detail?.latestDeployment?.status ?? "NotScheduled",
            reason: formatActionSummary(recommendation),
            isSimulated: true
        };
    }).sort((left, right)=>right.triageScore - left.triageScore);
}
function buildReportsIngestion(healthService, jobs) {
    const seed = seedFromString(`${healthService}:${jobs.length}`);
    const random = mulberry32(seed);
    const sources = [
        "EDR stream",
        "SIEM collector",
        "DNS sink",
        "Email telemetry"
    ];
    return sources.map((source, index)=>({
            source,
            freshness: index % 2 === 0 ? "Fresh" : "Aging",
            quality: numberInRange(random, 71, 98),
            notes: jobs.length > index ? `Recent ${jobs[index].jobType} job completed ${jobs[index].status.toLowerCase()}.` : "No recent job telemetry."
        }));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/shared/gateway/augmented-gateway.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "AugmentedGateway",
    ()=>AugmentedGateway
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/gateway/adapters.ts [app-client] (ecmascript)");
;
class AugmentedGateway {
    source;
    constructor(source){
        this.source = source;
    }
    login(username, password) {
        return this.source.login(username, password);
    }
    listAlertRegistry(query, signal) {
        return this.source.listAlertRegistry(query, signal);
    }
    listAlerts(signal) {
        return this.source.listAlerts(signal);
    }
    getAlert(alertId, signal) {
        return this.source.getAlert(alertId, signal);
    }
    listCases(signal) {
        return this.listAlerts(signal);
    }
    getCase(caseId, signal) {
        return this.getAlert(caseId, signal);
    }
    listEvidence(caseId, signal) {
        return this.source.listEvidence(caseId, signal);
    }
    listDecisions(caseId, signal) {
        return this.source.listDecisions(caseId, signal);
    }
    listRules(caseId, signal) {
        return this.source.listRules(caseId, signal);
    }
    listRuleRepository(query, signal) {
        return this.source.listRuleRepository(query, signal);
    }
    getRuleDetail(ruleId, signal) {
        return this.source.getRuleDetail(ruleId, signal);
    }
    createRule(input) {
        return this.source.createRule(input);
    }
    importRuleFile(input) {
        return this.source.importRuleFile(input);
    }
    updateRule(ruleId, input) {
        return this.source.updateRule(ruleId, input);
    }
    listRuleRevisions(ruleId, signal) {
        return this.source.listRuleRevisions(ruleId, signal);
    }
    listRuleImportAttempts(ruleId, signal) {
        return this.source.listRuleImportAttempts(ruleId, signal);
    }
    archiveRule(ruleId, input) {
        return this.source.archiveRule(ruleId, input);
    }
    restoreRule(ruleId, input) {
        return this.source.restoreRule(ruleId, input);
    }
    listDeployments(caseId, signal) {
        return this.source.listDeployments(caseId, signal);
    }
    listAllDeployments(signal) {
        return this.source.listAllDeployments(signal);
    }
    listFeedback(caseId, signal) {
        return this.source.listFeedback(caseId, signal);
    }
    listReports(query, signal) {
        return this.source.listReports(query, signal);
    }
    getPowerBiVisualizationCatalog(signal) {
        return this.source.getPowerBiVisualizationCatalog(signal);
    }
    listAuditLogs(query, signal) {
        return this.source.listAuditLogs(query, signal);
    }
    listJobRuns(signal) {
        return this.source.listJobRuns(signal);
    }
    listUsers(signal) {
        return this.source.listUsers(signal);
    }
    listRoles(signal) {
        return this.source.listRoles(signal);
    }
    createUser(input) {
        return this.source.createUser(input);
    }
    listSubnets(signal) {
        return this.source.listSubnets(signal);
    }
    listFeedSources(signal) {
        return this.source.listFeedSources(signal);
    }
    listIocs(query, signal) {
        return this.source.listIocs(query, signal);
    }
    listTargetServers(subnetId, signal) {
        return this.source.listTargetServers(subnetId, signal);
    }
    listTargetGroups(signal) {
        return this.source.listTargetGroups(signal);
    }
    listTargetGroupMembers(targetGroupId, signal) {
        return this.source.listTargetGroupMembers(targetGroupId, signal);
    }
    listDistributionJobs(filters, signal) {
        return this.source.listDistributionJobs(filters, signal);
    }
    getDistributionJob(jobId, signal) {
        return this.source.getDistributionJob(jobId, signal);
    }
    listDistributionJobAttempts(jobId, signal) {
        return this.source.listDistributionJobAttempts(jobId, signal);
    }
    listDistributionJobTargets(jobId, signal) {
        return this.source.listDistributionJobTargets(jobId, signal);
    }
    createDistributionJob(input) {
        return this.source.createDistributionJob(input);
    }
    retryDistributionJob(jobId, input) {
        return this.source.retryDistributionJob(jobId, input);
    }
    listScanPlans(signal) {
        return this.source.listScanPlans(signal);
    }
    getScanPlan(scanPlanId, signal) {
        return this.source.getScanPlan(scanPlanId, signal);
    }
    createScanPlan(input) {
        return this.source.createScanPlan(input);
    }
    updateScanPlan(scanPlanId, input) {
        return this.source.updateScanPlan(scanPlanId, input);
    }
    runScanPlan(scanPlanId, actorUserId, triggerSource) {
        return this.source.runScanPlan(scanPlanId, actorUserId, triggerSource);
    }
    listScanJobs(filters, signal) {
        return this.source.listScanJobs(filters, signal);
    }
    getScanJob(scanJobId, signal) {
        return this.source.getScanJob(scanJobId, signal);
    }
    listScanJobTargets(scanJobId, signal) {
        return this.source.listScanJobTargets(scanJobId, signal);
    }
    cancelScanJob(scanJobId, actorUserId, reason) {
        return this.source.cancelScanJob(scanJobId, actorUserId, reason);
    }
    listManagedServers(filters, signal) {
        return this.source.listManagedServers(filters, signal);
    }
    getManagedServer(targetServerId, signal) {
        return this.source.getManagedServer(targetServerId, signal);
    }
    createManagedServer(input) {
        return this.source.createManagedServer(input);
    }
    updateManagedServer(targetServerId, input) {
        return this.source.updateManagedServer(targetServerId, input);
    }
    rotateManagedServerConnectionSecret(targetServerId, input) {
        return this.source.rotateManagedServerConnectionSecret(targetServerId, input);
    }
    upsertManagedServerScannerAssignment(targetServerId, scannerId, input) {
        return this.source.upsertManagedServerScannerAssignment(targetServerId, scannerId, input);
    }
    removeManagedServerScannerAssignment(targetServerId, scannerId) {
        return this.source.removeManagedServerScannerAssignment(targetServerId, scannerId);
    }
    listScanners(signal) {
        return this.source.listScanners(signal);
    }
    queueDiscoveryRun(input) {
        return this.source.queueDiscoveryRun(input);
    }
    listDiscoveryRuns(subnetId, signal) {
        return this.source.listDiscoveryRuns(subnetId, signal);
    }
    listDiscoveredHosts(subnetId, signal) {
        return this.source.listDiscoveredHosts(subnetId, signal);
    }
    listDetections(query, signal) {
        return this.source.listDetections(query, signal);
    }
    promoteDiscoveredHost(discoveredHostId, input) {
        return this.source.promoteDiscoveredHost(discoveredHostId, input);
    }
    getHealthInfo(signal) {
        return this.source.getHealthInfo(signal);
    }
    getHealthReady(signal) {
        return this.source.getHealthReady(signal);
    }
    getHealthAdmin(signal) {
        return this.source.getHealthAdmin(signal);
    }
    getAlertRuleWorkflow(alertId, signal) {
        return this.source.getAlertRuleWorkflow(alertId, signal);
    }
    getCaseRuleWorkflow(caseId, signal) {
        return this.getAlertRuleWorkflow(caseId, signal);
    }
    createRuleProposal(input) {
        return this.source.createRuleProposal(input);
    }
    reviewRuleProposal(proposalId, input) {
        return this.source.reviewRuleProposal(proposalId, input);
    }
    simulateRuleProposal(proposalId, input) {
        return this.source.simulateRuleProposal(proposalId, input);
    }
    advanceRolloutStage(rolloutPlanId, input) {
        return this.source.advanceRolloutStage(rolloutPlanId, input);
    }
    recordCanaryObservation(rolloutPlanId, input) {
        return this.source.recordCanaryObservation(rolloutPlanId, input);
    }
    triggerRollback(rollbackPlanId, input) {
        return this.source.triggerRollback(rollbackPlanId, input);
    }
    runModelRetraining(triggeredByUserId) {
        return this.source.runModelRetraining(triggeredByUserId);
    }
    async getCaseDetail(caseId, signal) {
        const [caseItem, evidence, decisions, deployments, rules, feedback, workflow] = await Promise.all([
            this.source.getAlert(caseId, signal),
            this.source.listEvidence(caseId, signal),
            this.source.listDecisions(caseId, signal),
            this.source.listDeployments(caseId, signal),
            this.source.listRules(caseId, signal),
            this.source.listFeedback(caseId, signal),
            this.source.getAlertRuleWorkflow(caseId, signal)
        ]);
        const latestDecision = decisions.slice().sort((left, right)=>Date.parse(right.updatedAtUtc) - Date.parse(left.updatedAtUtc))[0] ?? null;
        const latestDeployment = deployments.slice().sort((left, right)=>Date.parse(right.updatedAtUtc) - Date.parse(left.updatedAtUtc))[0] ?? null;
        const latestRollout = workflow.rolloutPlans.slice().sort((left, right)=>Date.parse(right.updatedAtUtc) - Date.parse(left.updatedAtUtc))[0] ?? null;
        const latestRollback = (latestRollout ? workflow.rollbackPlans.find((item)=>item.rolloutPlanId === latestRollout.id) : null) ?? workflow.rollbackPlans.slice().sort((left, right)=>Date.parse(right.updatedAtUtc) - Date.parse(left.updatedAtUtc))[0] ?? null;
        return {
            caseItem,
            latestDecision,
            latestDeployment,
            scoreAxes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildScoreAxes"])(caseId, evidence, decisions),
            recommendedAction: latestDecision?.recommendedAction ?? "request_more_evidence",
            decisionState: latestDecision?.state ?? "Proposed",
            approvalTier: latestDecision?.approvalTierRequired ?? caseItem.approvalTierRequired,
            rolloutPlan: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["synthesizeRolloutPlan"])(caseItem, latestDeployment),
            rollbackPlan: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["synthesizeRollbackPlan"])(caseItem, latestDeployment),
            topEvidence: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildTopEvidence"])(evidence),
            graphNeighbors: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildGraphNeighbors"])(caseId),
            similarHistoricalCases: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildSimilarHistoricalCases"])(caseId),
            nextBestEvidence: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildNextBestEvidence"])(caseId),
            activityTimeline: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildActivityTimeline"])(decisions, deployments, feedback),
            linkedRules: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildLinkedRules"])(rules, workflow),
            linkedReports: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildLinkedReports"])(evidence, feedback),
            policyGuardrails: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildPolicyGuardrails"])(latestDecision, workflow, latestRollout, latestRollback, caseItem),
            isSimulated: true
        };
    }
    async getOverview(signal) {
        const cases = await this.source.listAlerts(signal);
        const details = await Promise.all(cases.slice(0, 8).map((item)=>this.getCaseDetail(item.id, signal)));
        const queue = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildQueue"])(cases, details).slice(0, 5);
        const openCount = cases.filter((item)=>item.status.toLowerCase() !== "closed").length;
        const approvalCount = cases.filter((item)=>item.status.toLowerCase().includes("approval")).length;
        const highRiskCount = queue.filter((item)=>item.policyRisk >= 70).length;
        const canaryCount = queue.filter((item)=>item.rolloutState.toLowerCase().includes("canary")).length;
        const cards = [
            {
                key: "approval_pressure",
                title: "Approval Pressure",
                value: String(approvalCount),
                subtitle: "Alerts waiting for lead/admin decision",
                trend: `${Math.max(1, approvalCount)} active`
            },
            {
                key: "policy_friction",
                title: "Policy Friction",
                value: String(highRiskCount),
                subtitle: "Queue items at elevated policy risk",
                trend: "risk >= 70"
            },
            {
                key: "evidence_freshness",
                title: "Evidence Freshness",
                value: `${Math.max(0, 96 - approvalCount)}%`,
                subtitle: "Recent telemetry coverage across active alerts",
                trend: `${openCount} open alerts`
            },
            {
                key: "rollout_watch",
                title: "Rollout Watch",
                value: String(canaryCount),
                subtitle: "Alerts under canary or promotion monitoring",
                trend: "rollback guard enabled"
            }
        ];
        return {
            cards,
            queue,
            isSimulated: true
        };
    }
    async getProblematicQueue(signal) {
        const cases = await this.source.listAlerts(signal);
        const details = await Promise.all(cases.map((item)=>this.getCaseDetail(item.id, signal)));
        return {
            queue: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildQueue"])(cases, details),
            isSimulated: true
        };
    }
    async getReportsIngestion(signal) {
        const [healthInfo, recentJobs] = await Promise.all([
            this.source.getHealthInfo(signal),
            this.source.listJobRuns(signal)
        ]);
        return {
            healthInfo,
            recentJobs,
            ingestionSummary: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildReportsIngestion"])(healthInfo.service, recentJobs),
            isSimulated: true
        };
    }
    async getGraphRelationships(caseId, signal) {
        const [caseItem, evidence, rules, allCases] = await Promise.all([
            this.source.getAlert(caseId, signal),
            this.source.listEvidence(caseId, signal),
            this.source.listRules(caseId, signal),
            this.source.listAlerts(signal)
        ]);
        const investigation = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildGraphInvestigation"])(caseItem, evidence, rules, allCases);
        return {
            focalCaseId: caseId,
            nodes: investigation.nodes,
            edges: investigation.edges,
            pathHints: investigation.pathHints,
            timeBounds: investigation.timeBounds,
            isSimulated: true
        };
    }
    async getSettingsAdmin(signal) {
        const [healthInfo, healthAdmin, recentJobs] = await Promise.all([
            this.source.getHealthInfo(signal),
            this.source.getHealthAdmin(signal),
            this.source.listJobRuns(signal)
        ]);
        return {
            healthInfo,
            healthAdmin,
            recentJobs
        };
    }
    getCoveragePainAnalysis(input, signal) {
        return this.source.getCoveragePainAnalysis(input, signal);
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/shared/mock/utils.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "atOffset",
    ()=>atOffset,
    "deepCopy",
    ()=>deepCopy,
    "deterministicUuid",
    ()=>deterministicUuid,
    "hashSeed",
    ()=>hashSeed,
    "seededRandom",
    ()=>seededRandom,
    "toJwt",
    ()=>toJwt
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$buffer$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/compiled/buffer/index.js [app-client] (ecmascript)");
function hashSeed(value) {
    let hash = 2166136261;
    for(let index = 0; index < value.length; index += 1){
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}
function seededRandom(seed) {
    let value = hashSeed(seed);
    return ()=>{
        value += 0x6d2b79f5;
        let next = Math.imul(value ^ value >>> 15, 1 | value);
        next ^= next + Math.imul(next ^ next >>> 7, 61 | next);
        return ((next ^ next >>> 14) >>> 0) / 4294967296;
    };
}
function hexChunk(input, length) {
    const characters = "0123456789abcdef";
    let output = "";
    for(let index = 0; index < length; index += 1){
        output += characters[input.charCodeAt(index % input.length) % characters.length];
    }
    return output;
}
function deterministicUuid(seed) {
    const hashed = `${hashSeed(seed).toString(16)}${hashSeed(`${seed}:salt`).toString(16)}${hashSeed(`${seed}:v`).toString(16)}`;
    const base = hexChunk(hashed, 32);
    const chars = base.split("");
    chars[12] = "4";
    const variant = Number.parseInt(chars[16], 16);
    chars[16] = (variant & 0x3 | 0x8).toString(16);
    return `${chars.slice(0, 8).join("")}-${chars.slice(8, 12).join("")}-${chars.slice(12, 16).join("")}-${chars.slice(16, 20).join("")}-${chars.slice(20, 32).join("")}`;
}
function deepCopy(value) {
    return JSON.parse(JSON.stringify(value));
}
function atOffset(referenceUtc, minutesAgo) {
    return new Date(Date.parse(referenceUtc) - minutesAgo * 60 * 1000).toISOString();
}
function toJwt(payload) {
    const header = {
        alg: "none",
        typ: "JWT"
    };
    const encode = (input)=>{
        const text = JSON.stringify(input);
        if (("TURBOPACK compile-time value", "object") !== "undefined" && typeof window.btoa === "function") {
            const ascii = encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, (_match, hex)=>String.fromCharCode(Number.parseInt(hex, 16)));
            return window.btoa(ascii).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        }
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$buffer$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Buffer"].from(text).toString("base64url");
    };
    return `${encode(header)}.${encode(payload)}.`;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/shared/mock/personas.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MOCK_PERSONAS",
    ()=>MOCK_PERSONAS,
    "issuePersonaToken",
    ()=>issuePersonaToken,
    "listMockPersonas",
    ()=>listMockPersonas
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/mock/utils.ts [app-client] (ecmascript)");
;
const ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
const MOCK_PERSONAS = [
    {
        id: "analyst-1",
        username: "analyst.demo",
        displayName: "Analyst",
        roles: [
            "Analyst"
        ],
        focus: "Design review for analyst triage workflows"
    },
    {
        id: "lead-1",
        username: "operator.demo",
        displayName: "Operator",
        roles: [
            "Lead"
        ],
        focus: "Design review for approval and rollout workflows"
    },
    {
        id: "admin-1",
        username: "admin.demo",
        displayName: "Administrator",
        roles: [
            "Admin"
        ],
        focus: "Design review for platform and orchestration controls"
    }
];
function listMockPersonas() {
    return MOCK_PERSONAS;
}
function issuePersonaToken(persona) {
    const expiresAtUtc = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
    const accessToken = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["toJwt"])({
        sub: persona.id,
        unique_name: persona.username,
        [ROLE_CLAIM]: persona.roles,
        role: persona.roles,
        exp: Math.floor(Date.parse(expiresAtUtc) / 1000)
    });
    return {
        accessToken,
        expiresAtUtc,
        tokenType: "Bearer"
    };
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/shared/mock/selectors.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "selectAllDeployments",
    ()=>selectAllDeployments,
    "selectCase",
    ()=>selectCase,
    "selectCaseDetail",
    ()=>selectCaseDetail,
    "selectCaseRuleWorkflow",
    ()=>selectCaseRuleWorkflow,
    "selectCases",
    ()=>selectCases,
    "selectDecisions",
    ()=>selectDecisions,
    "selectDeployments",
    ()=>selectDeployments,
    "selectEvidence",
    ()=>selectEvidence,
    "selectFeedback",
    ()=>selectFeedback,
    "selectGraphRelationships",
    ()=>selectGraphRelationships,
    "selectJobRuns",
    ()=>selectJobRuns,
    "selectOverview",
    ()=>selectOverview,
    "selectProblematicQueue",
    ()=>selectProblematicQueue,
    "selectProposal",
    ()=>selectProposal,
    "selectQueue",
    ()=>selectQueue,
    "selectReportsIngestion",
    ()=>selectReportsIngestion,
    "selectRollback",
    ()=>selectRollback,
    "selectRollout",
    ()=>selectRollout,
    "selectRules",
    ()=>selectRules,
    "selectSettingsAdmin",
    ()=>selectSettingsAdmin
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/gateway/adapters.ts [app-client] (ecmascript)");
;
function sortByUpdatedDescending(rows) {
    return rows.slice().sort((left, right)=>Date.parse(right.updatedAtUtc) - Date.parse(left.updatedAtUtc));
}
function rowsByCaseId(state, index, source, caseId) {
    return (index[caseId] ?? []).map((id)=>source[id]).filter((item)=>Boolean(item));
}
function selectCases(state) {
    return state.indices.caseIds.map((id)=>state.entities.cases[id]).filter((item)=>Boolean(item));
}
function selectCase(state, caseId) {
    const result = state.entities.cases[caseId];
    if (!result) {
        throw new Error(`Case ${caseId} not found in mock store.`);
    }
    return result;
}
function selectEvidence(state, caseId) {
    return rowsByCaseId(state, state.indices.evidenceByCase, state.entities.evidence, caseId).sort((left, right)=>Date.parse(right.collectedAtUtc) - Date.parse(left.collectedAtUtc));
}
function selectDecisions(state, caseId) {
    return sortByUpdatedDescending(rowsByCaseId(state, state.indices.decisionsByCase, state.entities.decisions, caseId));
}
function selectRules(state, caseId) {
    return sortByUpdatedDescending(rowsByCaseId(state, state.indices.rulesByCase, state.entities.rules, caseId));
}
function selectDeployments(state, caseId) {
    return sortByUpdatedDescending(rowsByCaseId(state, state.indices.deploymentsByCase, state.entities.deployments, caseId));
}
function selectAllDeployments(state) {
    return sortByUpdatedDescending(Object.values(state.entities.deployments));
}
function selectFeedback(state, caseId) {
    return rowsByCaseId(state, state.indices.feedbackByCase, state.entities.feedback, caseId).sort((left, right)=>Date.parse(right.submittedAtUtc) - Date.parse(left.submittedAtUtc));
}
function selectJobRuns(state) {
    return Object.values(state.entities.jobs).sort((left, right)=>Date.parse(right.startedAtUtc) - Date.parse(left.startedAtUtc));
}
function selectCaseRuleWorkflow(state, caseId) {
    const proposals = sortByUpdatedDescending(rowsByCaseId(state, state.indices.proposalsByCase, state.entities.ruleProposals, caseId));
    const recommendations = sortByUpdatedDescending(rowsByCaseId(state, state.indices.recommendationsByCase, state.entities.recommendations, caseId));
    const rolloutPlans = sortByUpdatedDescending(rowsByCaseId(state, state.indices.rolloutsByCase, state.entities.rollouts, caseId));
    const rollbackPlans = sortByUpdatedDescending(rowsByCaseId(state, state.indices.rollbacksByCase, state.entities.rollbacks, caseId));
    const acceptanceBase = recommendations.length === 0 ? 0.7 : recommendations.reduce((sum, item)=>sum + item.analystAcceptanceRate, 0) / recommendations.length;
    return {
        caseId,
        proposals,
        recommendations,
        rolloutPlans,
        rollbackPlans,
        analystAcceptanceRate: Number.parseFloat(acceptanceBase.toFixed(3))
    };
}
function selectCaseDetail(state, caseId) {
    const caseItem = selectCase(state, caseId);
    const evidence = selectEvidence(state, caseId);
    const decisions = selectDecisions(state, caseId);
    const deployments = selectDeployments(state, caseId);
    const rules = selectRules(state, caseId);
    const feedback = selectFeedback(state, caseId);
    const workflow = selectCaseRuleWorkflow(state, caseId);
    const latestDecision = decisions[0] ?? null;
    const latestDeployment = deployments[0] ?? null;
    const latestRollout = workflow.rolloutPlans[0] ?? null;
    const latestRollback = (latestRollout ? workflow.rollbackPlans.find((item)=>item.rolloutPlanId === latestRollout.id) : null) ?? workflow.rollbackPlans[0] ?? null;
    return {
        caseItem,
        latestDecision,
        latestDeployment,
        scoreAxes: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildScoreAxes"])(caseId, evidence, decisions),
        recommendedAction: latestDecision?.recommendedAction ?? "request_more_evidence",
        decisionState: latestDecision?.state ?? "Investigating",
        approvalTier: latestDecision?.approvalTierRequired ?? caseItem.approvalTierRequired,
        rolloutPlan: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["synthesizeRolloutPlan"])(caseItem, latestDeployment),
        rollbackPlan: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["synthesizeRollbackPlan"])(caseItem, latestDeployment),
        topEvidence: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildTopEvidence"])(evidence),
        graphNeighbors: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildGraphNeighbors"])(caseId),
        similarHistoricalCases: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildSimilarHistoricalCases"])(caseId),
        nextBestEvidence: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildNextBestEvidence"])(caseId),
        activityTimeline: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildActivityTimeline"])(decisions, deployments, feedback),
        linkedRules: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildLinkedRules"])(rules, workflow),
        linkedReports: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildLinkedReports"])(evidence, feedback),
        policyGuardrails: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildPolicyGuardrails"])(latestDecision, workflow, latestRollout, latestRollback, caseItem),
        isSimulated: true
    };
}
function selectQueue(state) {
    const cases = selectCases(state);
    const details = cases.map((item)=>selectCaseDetail(state, item.id));
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildQueue"])(cases, details);
}
function selectOverview(state) {
    const cases = selectCases(state);
    const queue = selectQueue(state).slice(0, 6);
    const awaitingApproval = cases.filter((item)=>item.status.toLowerCase().includes("approval")).length;
    const highRisk = queue.filter((item)=>item.policyRisk >= 70).length;
    const underCanary = queue.filter((item)=>item.rolloutState.toLowerCase().includes("canary")).length;
    const evidenceFreshness = Math.max(62, 95 - awaitingApproval * 3);
    const cards = [
        {
            key: "approval_pressure",
            title: "Approval Pressure",
            value: String(awaitingApproval),
            subtitle: "Alerts waiting on lead/admin sign-off",
            trend: `${awaitingApproval} requiring action`
        },
        {
            key: "policy_friction",
            title: "Policy Friction",
            value: String(highRisk),
            subtitle: "Queue items with elevated risk",
            trend: "risk >= 70"
        },
        {
            key: "evidence_freshness",
            title: "Evidence Freshness",
            value: `${evidenceFreshness}%`,
            subtitle: "Correlated telemetry recency across active alerts",
            trend: `${cases.length} active scenarios`
        },
        {
            key: "rollout_watch",
            title: "Rollout Watch",
            value: String(underCanary),
            subtitle: "Alerts under canary/promote observation",
            trend: "rollback guards enforced"
        }
    ];
    return {
        cards,
        queue,
        isSimulated: true
    };
}
function selectProblematicQueue(state) {
    return {
        queue: selectQueue(state),
        isSimulated: true
    };
}
function selectReportsIngestion(state) {
    const healthInfo = {
        service: "IoC Manager Mock Gateway",
        environment: "frontend-prototype",
        utcNow: state.meta.referenceUtc
    };
    const recentJobs = selectJobRuns(state);
    return {
        healthInfo,
        recentJobs,
        ingestionSummary: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildReportsIngestion"])(healthInfo.service, recentJobs),
        isSimulated: true
    };
}
function selectGraphRelationships(state, caseId) {
    const caseItem = selectCase(state, caseId);
    const evidence = selectEvidence(state, caseId);
    const rules = selectRules(state, caseId);
    const allCases = selectCases(state);
    const graph = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$adapters$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["buildGraphInvestigation"])(caseItem, evidence, rules, allCases);
    return {
        focalCaseId: caseId,
        nodes: graph.nodes,
        edges: graph.edges,
        pathHints: graph.pathHints,
        timeBounds: graph.timeBounds,
        isSimulated: true
    };
}
function selectSettingsAdmin(state) {
    return {
        healthInfo: {
            service: "IoC Manager Mock Gateway",
            environment: "frontend-prototype",
            utcNow: state.meta.referenceUtc
        },
        healthAdmin: {
            runtime: "nextjs",
            machineName: "frontend-prototype-node",
            processId: 1
        },
        recentJobs: selectJobRuns(state)
    };
}
function selectRollout(state, rolloutId) {
    const rollout = state.entities.rollouts[rolloutId];
    if (!rollout) {
        throw new Error(`Rollout ${rolloutId} not found.`);
    }
    return rollout;
}
function selectRollback(state, rollbackId) {
    const rollback = state.entities.rollbacks[rollbackId];
    if (!rollback) {
        throw new Error(`Rollback ${rollbackId} not found.`);
    }
    return rollback;
}
function selectProposal(state, proposalId) {
    const proposal = state.entities.ruleProposals[proposalId];
    if (!proposal) {
        throw new Error(`Rule proposal ${proposalId} not found.`);
    }
    return proposal;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/shared/mock/scenarios.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "createScenarioState",
    ()=>createScenarioState
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/mock/utils.ts [app-client] (ecmascript)");
;
const referenceUtc = "2026-03-15T09:00:00.000Z";
const caseRows = [
    {
        id: "11111111-1111-4111-8111-111111111111",
        title: "Credential Replay Chain in Treasury Segment",
        summary: "Service account replay followed by suspicious lateral movement toward treasury workloads.",
        priority: "Critical",
        status: "AwaitingApproval",
        ownerUserId: "analyst-1",
        approvalTierRequired: "Lead",
        createdAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 1400),
        updatedAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 35)
    },
    {
        id: "22222222-2222-4222-8222-222222222222",
        title: "C2 Beacon Burst via New Domain Cluster",
        summary: "Beaconing interval burst and JA3 overlap indicate active command-and-control infrastructure.",
        priority: "Critical",
        status: "Investigating",
        ownerUserId: "analyst-1",
        approvalTierRequired: "Lead",
        createdAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 2020),
        updatedAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 48)
    },
    {
        id: "33333333-3333-4333-8333-333333333333",
        title: "Cloud Identity Abuse Through Token Drift",
        summary: "Privileged cloud session anomalies with unusual token replay cadence across regions.",
        priority: "High",
        status: "Investigating",
        ownerUserId: "lead-1",
        approvalTierRequired: "Admin",
        createdAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 980),
        updatedAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 75)
    },
    {
        id: "44444444-4444-4444-8444-444444444444",
        title: "Phishing Sender Infrastructure Expansion",
        summary: "Look-alike sender graph indicates campaign expansion into finance users.",
        priority: "High",
        status: "Investigating",
        ownerUserId: "analyst-1",
        approvalTierRequired: "Lead",
        createdAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 820),
        updatedAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 92)
    },
    {
        id: "55555555-5555-4555-8555-555555555555",
        title: "Endpoint Artifact Swarm in Remote Office",
        summary: "High-volume artifact hits with uncertain lineage and incomplete endpoint telemetry.",
        priority: "Medium",
        status: "Investigating",
        ownerUserId: "analyst-1",
        approvalTierRequired: "Analyst",
        createdAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 700),
        updatedAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 130)
    }
];
function evidence(caseId, seed, evidenceType, sourceSystem, confidence, minutesAgo) {
    return {
        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deterministicUuid"])(`evidence:${seed}`),
        caseId,
        evidenceType,
        sourceSystem,
        contentHash: `${seed}f2d7a9c37b1e0d5588a91c2d7f4b9d8e`,
        confidence,
        collectedAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, minutesAgo),
        createdAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, minutesAgo + 5)
    };
}
const evidenceRows = [
    evidence(caseRows[0].id, "cred-replay-a", "CredentialDumpArtifact", "EDR", 0.91, 62),
    evidence(caseRows[0].id, "cred-replay-b", "LoginAnomaly", "IdentityTelemetry", 0.86, 54),
    evidence(caseRows[0].id, "cred-replay-c", "SessionReplayIndicator", "SIEM", 0.79, 45),
    evidence(caseRows[1].id, "c2-beacon-a", "BeaconInterval", "NetFlow", 0.88, 90),
    evidence(caseRows[1].id, "c2-beacon-b", "JA3Match", "IDS", 0.84, 70),
    evidence(caseRows[1].id, "c2-beacon-c", "PassiveDNSLink", "DNS", 0.76, 60),
    evidence(caseRows[2].id, "cloud-abuse-a", "PrivilegedSessionAnomaly", "CloudAudit", 0.83, 100),
    evidence(caseRows[2].id, "cloud-abuse-b", "TokenReplay", "IdentityTelemetry", 0.8, 84),
    evidence(caseRows[2].id, "cloud-abuse-c", "GeoDrift", "CloudAudit", 0.71, 78),
    evidence(caseRows[3].id, "phish-a", "SenderInfrastructure", "EmailGateway", 0.74, 130),
    evidence(caseRows[3].id, "phish-b", "LookalikeDomain", "PassiveDNS", 0.67, 126),
    evidence(caseRows[4].id, "artifact-a", "EndpointHashHit", "EDR", 0.69, 155)
];
function decision(caseItem, seed, state, action, minutesAgo) {
    return {
        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deterministicUuid"])(`decision:${seed}`),
        caseId: caseItem.id,
        state,
        recommendedAction: action,
        approvalTierRequired: caseItem.approvalTierRequired,
        policyVersion: "policy-2026.03",
        modelVersion: "fusion-v2.4",
        reasoning: `${caseItem.title} scored above escalation threshold with policy-guarded action plan.`,
        approvedByUserId: state === "Approved" ? "lead-1" : null,
        approvedAtUtc: state === "Approved" ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, minutesAgo - 2) : null,
        createdAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, minutesAgo + 8),
        updatedAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, minutesAgo)
    };
}
const decisionRows = [
    decision(caseRows[0], "cred-approval", "AwaitingApproval", "contain_identity_and_rotate_secrets", 40),
    decision(caseRows[1], "c2-investigating", "Investigating", "expand_graph_scope_and_collect_dns_provenance", 55),
    decision(caseRows[2], "cloud-investigating", "Investigating", "request_more_evidence", 88),
    decision(caseRows[3], "phish-investigating", "Investigating", "block_sender_infrastructure", 110),
    decision(caseRows[4], "artifact-investigating", "Investigating", "request_more_evidence", 140)
];
function rule(caseId, seed, name, family, status, minutesAgo) {
    return {
        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deterministicUuid"])(`rule:${seed}`),
        caseId,
        name,
        ruleFamily: family,
        ruleBody: `// ${name}\n${family} detector body for ${seed}`,
        version: "v1.0.0",
        status,
        createdAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, minutesAgo + 80),
        updatedAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, minutesAgo)
    };
}
const ruleRows = [
    rule(caseRows[0].id, "cred-rule", "Credential Replay Burst Rule", "sigma", "Review", 46),
    rule(caseRows[1].id, "c2-rule", "JA3 C2 Burst Rule", "snort", "Canary", 72),
    rule(caseRows[2].id, "cloud-rule", "Cloud Token Drift Rule", "yara", "Draft", 96)
];
function proposal(caseItem, ruleFamily, status, seed, minutesAgo) {
    return {
        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deterministicUuid"])(`proposal:${seed}`),
        caseId: caseItem.id,
        proposalName: `${caseItem.title.split(" ").slice(0, 3).join(" ")} Proposal`,
        ruleFamily,
        ruleBody: `proposal body for ${seed}`,
        proposedVersion: "v1.1.0",
        proposedByUserId: "analyst-1",
        rationale: "Policy-gated hardening proposal derived from scenario evidence pack.",
        policyRiskScore: 0.34 + minutesAgo % 20 / 100,
        status,
        reviewedByUserId: status === "Accepted" ? "lead-1" : null,
        reviewedAtUtc: status === "Accepted" ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, minutesAgo - 2) : null,
        reviewReason: status === "Accepted" ? "Meets containment and precision thresholds." : null,
        overrideReason: null,
        createdAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, minutesAgo + 22),
        updatedAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, minutesAgo)
    };
}
const proposalRows = [
    proposal(caseRows[0], "sigma", "InReview", "cred-proposal", 41),
    proposal(caseRows[1], "snort", "Accepted", "c2-proposal", 68),
    proposal(caseRows[2], "yara", "Draft", "cloud-proposal", 94)
];
const recommendationRows = [
    {
        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deterministicUuid"])("recommendation:c2"),
        caseId: caseRows[1].id,
        ruleProposalId: proposalRows[1].id,
        targetEnvironment: "production",
        recommendedStage: "canary",
        riskScore: 0.41,
        predictedNoise: 0.17,
        baselineNoise: 0.14,
        predictedNoiseDelta: 0.03,
        analystAcceptanceRate: 0.82,
        requiresHumanApproval: true,
        autoPublishEnabled: false,
        requestedByUserId: "analyst-1",
        rationale: "Containment value exceeds rollout risk with manual promotion controls.",
        recommendedAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 65),
        createdAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 65),
        updatedAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 65)
    }
];
const rolloutRows = [
    {
        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deterministicUuid"])("rollout:c2"),
        caseId: caseRows[1].id,
        ruleProposalId: proposalRows[1].id,
        deploymentRecommendationId: recommendationRows[0].id,
        currentStage: "canary",
        canaryTrafficPercent: 15,
        predictedNoise: 0.17,
        observedNoise: 0.18,
        observedNoiseDelta: 0.04,
        analystAcceptanceRate: 0.8,
        requiresManualPromotion: true,
        shadowStartedAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 82),
        canaryStartedAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 61),
        promotedAtUtc: null,
        rolledBackAtUtc: null,
        lastStageReason: "Canary started after lead acceptance.",
        lastOverrideReason: null,
        createdAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 82),
        updatedAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 52)
    }
];
const rollbackRows = [
    {
        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deterministicUuid"])("rollback:c2"),
        caseId: caseRows[1].id,
        ruleProposalId: proposalRows[1].id,
        rolloutPlanId: rolloutRows[0].id,
        triggerCondition: "observed_noise_delta > 0.12 for 30 minutes",
        recoveryPlaybook: "Disable rule bundle, restore previous stable version, notify lead and admin.",
        predictedNoiseThreshold: 0.27,
        lastObservedNoise: 0.18,
        triggerConditionMet: false,
        isTriggered: false,
        triggeredByUserId: null,
        triggeredAtUtc: null,
        triggerReason: null,
        createdAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 82),
        updatedAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 52)
    }
];
const deploymentRows = [
    {
        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deterministicUuid"])("deployment:c2-canary"),
        caseId: caseRows[1].id,
        ruleId: ruleRows[1].id,
        targetEnvironment: "production",
        status: "Canary",
        requestedByUserId: "analyst-1",
        approvedByUserId: "lead-1",
        approvedAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 62),
        deployedAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 61),
        createdAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 63),
        updatedAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 52)
    }
];
const feedbackRows = [
    {
        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deterministicUuid"])("feedback:cred"),
        caseId: caseRows[0].id,
        decisionId: decisionRows[0].id,
        verdict: "NeedsMoreEvidence",
        notes: "Approval held pending endpoint command lineage.",
        submittedByUserId: "lead-1",
        submittedAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 30)
    },
    {
        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deterministicUuid"])("feedback:c2"),
        caseId: caseRows[1].id,
        decisionId: decisionRows[1].id,
        verdict: "ApproveCanary",
        notes: "Canary is acceptable with manual promotion and rollback threshold.",
        submittedByUserId: "lead-1",
        submittedAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 50)
    }
];
const jobRows = [
    {
        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deterministicUuid"])("job:scan"),
        jobType: "ScanPlanExecution",
        status: "Completed",
        triggeredBy: "Administrator",
        details: "Scan plan execution completed with no critical drift.",
        startedAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 210),
        completedAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 205)
    },
    {
        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deterministicUuid"])("job:retrain"),
        jobType: "ModelRetraining",
        status: "Completed",
        triggeredBy: "Administrator",
        details: "Fusion model retraining applied to latest analyst feedback window.",
        startedAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 520),
        completedAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 470)
    }
];
const scenarioRows = [
    {
        id: "scenario-credential-replay",
        label: "Credential replay chain",
        summary: "Identity replay progression with approval-gated containment.",
        caseId: caseRows[0].id
    },
    {
        id: "scenario-c2-beacon",
        label: "C2 beacon campaign",
        summary: "Canary-stage rollout with rollback safety controls.",
        caseId: caseRows[1].id
    },
    {
        id: "scenario-cloud-identity-abuse",
        label: "Cloud identity abuse",
        summary: "Ambiguous evidence fusion requiring next-best-evidence capture.",
        caseId: caseRows[2].id
    }
];
const eventRows = [
    {
        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deterministicUuid"])("event:seed-1"),
        caseId: caseRows[0].id,
        type: "rule_proposal_created",
        actorUserId: "analyst-1",
        occurredAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 44),
        summary: "Initial proposal created for credential replay scenario.",
        details: {
            proposalId: proposalRows[0].id
        }
    },
    {
        id: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deterministicUuid"])("event:seed-2"),
        caseId: caseRows[1].id,
        type: "rule_proposal_simulated",
        actorUserId: "analyst-1",
        occurredAtUtc: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["atOffset"])(referenceUtc, 66),
        summary: "C2 proposal simulation generated rollout and rollback plans.",
        details: {
            proposalId: proposalRows[1].id,
            rolloutPlanId: rolloutRows[0].id
        }
    }
];
function indexById(rows) {
    return rows.reduce((accumulator, row)=>{
        accumulator[row.id] = row;
        return accumulator;
    }, {});
}
function groupByCase(rows) {
    return rows.reduce((accumulator, row)=>{
        accumulator[row.caseId] = [
            ...accumulator[row.caseId] ?? [],
            row.id
        ];
        return accumulator;
    }, {});
}
function buildIndices() {
    return {
        caseIds: caseRows.map((item)=>item.id),
        evidenceByCase: groupByCase(evidenceRows),
        decisionsByCase: groupByCase(decisionRows),
        rulesByCase: groupByCase(ruleRows),
        deploymentsByCase: groupByCase(deploymentRows),
        feedbackByCase: groupByCase(feedbackRows),
        proposalsByCase: groupByCase(proposalRows),
        recommendationsByCase: groupByCase(recommendationRows),
        rolloutsByCase: groupByCase(rolloutRows),
        rollbacksByCase: groupByCase(rollbackRows),
        jobsByType: jobRows.reduce((accumulator, row)=>{
            accumulator[row.jobType] = [
                ...accumulator[row.jobType] ?? [],
                row.id
            ];
            return accumulator;
        }, {})
    };
}
function createScenarioState() {
    const state = {
        entities: {
            cases: indexById(caseRows),
            evidence: indexById(evidenceRows),
            decisions: indexById(decisionRows),
            rules: indexById(ruleRows),
            deployments: indexById(deploymentRows),
            feedback: indexById(feedbackRows),
            ruleProposals: indexById(proposalRows),
            recommendations: indexById(recommendationRows),
            rollouts: indexById(rolloutRows),
            rollbacks: indexById(rollbackRows),
            jobs: indexById(jobRows)
        },
        indices: buildIndices(),
        events: eventRows,
        scenarios: scenarioRows,
        meta: {
            referenceUtc,
            tickMinutes: 3,
            sequence: 1
        }
    };
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deepCopy"])(state);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/shared/mock/store.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "getMockState",
    ()=>getMockState,
    "nextMockTimestamp",
    ()=>nextMockTimestamp,
    "resetMockState",
    ()=>resetMockState,
    "withMockState",
    ()=>withMockState
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$scenarios$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/mock/scenarios.ts [app-client] (ecmascript)");
;
let state = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$scenarios$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createScenarioState"])();
function getMockState() {
    return state;
}
function resetMockState() {
    state = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$scenarios$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createScenarioState"])();
}
function withMockState(mutation) {
    return mutation(state);
}
function nextMockTimestamp(current = state) {
    const next = new Date(Date.parse(current.meta.referenceUtc) + current.meta.sequence * current.meta.tickMinutes * 60 * 1000);
    current.meta.sequence += 1;
    return next.toISOString();
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/shared/mock/workflow.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "advanceRolloutStage",
    ()=>advanceRolloutStage,
    "createRuleProposal",
    ()=>createRuleProposal,
    "recordCanaryObservation",
    ()=>recordCanaryObservation,
    "reviewRuleProposal",
    ()=>reviewRuleProposal,
    "runModelRetraining",
    ()=>runModelRetraining,
    "simulateRuleProposal",
    ()=>simulateRuleProposal,
    "triggerRollback",
    ()=>triggerRollback
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/mock/utils.ts [app-client] (ecmascript)");
;
function nowUtc(state) {
    const result = new Date(Date.parse(state.meta.referenceUtc) + state.meta.sequence * state.meta.tickMinutes * 60 * 1000).toISOString();
    state.meta.sequence += 1;
    return result;
}
function nextId(state, scope) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deterministicUuid"])(`${scope}:${state.meta.sequence}`);
}
function appendEvent(state, caseId, type, actorUserId, summary, details) {
    const occurredAtUtc = nowUtc(state);
    const eventId = nextId(state, `event:${type}`);
    state.events.push({
        id: eventId,
        caseId,
        type,
        actorUserId,
        occurredAtUtc,
        summary,
        details
    });
    const feedbackId = nextId(state, `feedback:${type}`);
    const feedback = {
        id: feedbackId,
        caseId,
        decisionId: null,
        verdict: type,
        notes: summary,
        submittedByUserId: actorUserId,
        submittedAtUtc: occurredAtUtc
    };
    state.entities.feedback[feedbackId] = feedback;
    pushCaseIndex(state.indices.feedbackByCase, caseId, feedbackId);
}
function pushCaseIndex(index, caseId, id) {
    index[caseId] = [
        ...index[caseId] ?? [],
        id
    ];
}
function updateCaseTouch(state, caseId, status) {
    const caseItem = state.entities.cases[caseId];
    if (!caseItem) {
        return;
    }
    caseItem.updatedAtUtc = nowUtc(state);
    if (status) {
        caseItem.status = status;
    }
}
function createRuleProposal(state, input) {
    const caseId = input.alertId ?? input.caseId;
    if (!caseId || !state.entities.cases[caseId]) {
        throw new Error("Case not found for proposal creation.");
    }
    const id = nextId(state, "proposal");
    const timestamp = nowUtc(state);
    const proposal = {
        id,
        caseId,
        proposalName: input.proposalName,
        ruleFamily: input.ruleFamily,
        ruleBody: input.ruleBody,
        proposedVersion: input.proposedVersion,
        proposedByUserId: input.proposedByUserId,
        rationale: input.rationale,
        policyRiskScore: input.policyRiskScore ?? 0.4,
        status: "InReview",
        reviewedByUserId: null,
        reviewedAtUtc: null,
        reviewReason: null,
        overrideReason: null,
        createdAtUtc: timestamp,
        updatedAtUtc: timestamp
    };
    state.entities.ruleProposals[id] = proposal;
    pushCaseIndex(state.indices.proposalsByCase, caseId, id);
    appendEvent(state, caseId, "rule_proposal_created", input.proposedByUserId, `Proposal ${input.proposalName} created.`, {
        proposalId: id,
        ruleFamily: input.ruleFamily
    });
    updateCaseTouch(state, caseId, "Investigating");
    return proposal;
}
function reviewRuleProposal(state, proposalId, input) {
    const proposal = state.entities.ruleProposals[proposalId];
    if (!proposal) {
        throw new Error("Rule proposal not found.");
    }
    proposal.status = input.decision === "accept" ? "Accepted" : "Rejected";
    proposal.reviewedByUserId = input.reviewerUserId;
    proposal.reviewReason = input.reviewReason;
    proposal.overrideReason = input.overrideReason ?? null;
    proposal.reviewedAtUtc = nowUtc(state);
    proposal.updatedAtUtc = proposal.reviewedAtUtc;
    const caseId = proposal.caseId;
    appendEvent(state, caseId, "rule_proposal_reviewed", input.reviewerUserId, `Proposal ${proposal.proposalName} ${proposal.status.toLowerCase()}.`, {
        proposalId,
        decision: input.decision
    });
    updateCaseTouch(state, caseId, input.decision === "accept" ? "AwaitingApproval" : "Investigating");
    return proposal;
}
function simulateRuleProposal(state, proposalId, input) {
    const proposal = state.entities.ruleProposals[proposalId];
    if (!proposal) {
        throw new Error("Rule proposal not found.");
    }
    const random = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["seededRandom"])(`${proposal.id}:${proposal.updatedAtUtc}`);
    const caseId = proposal.caseId;
    const now = nowUtc(state);
    proposal.status = "Simulated";
    proposal.updatedAtUtc = now;
    const recommendationId = nextId(state, "recommendation");
    const recommendation = {
        id: recommendationId,
        caseId,
        ruleProposalId: proposal.id,
        targetEnvironment: input.targetEnvironment,
        recommendedStage: "shadow",
        riskScore: Number.parseFloat((0.32 + random() * 0.28).toFixed(3)),
        predictedNoise: Number.parseFloat((0.12 + random() * 0.15).toFixed(3)),
        baselineNoise: Number.parseFloat((0.09 + random() * 0.1).toFixed(3)),
        predictedNoiseDelta: Number.parseFloat((0.02 + random() * 0.06).toFixed(3)),
        analystAcceptanceRate: Number.parseFloat((0.68 + random() * 0.24).toFixed(3)),
        requiresHumanApproval: true,
        autoPublishEnabled: false,
        requestedByUserId: input.actorUserId,
        rationale: "Scenario simulation recommends staged rollout with explicit approval checkpoints.",
        recommendedAtUtc: now,
        createdAtUtc: now,
        updatedAtUtc: now
    };
    state.entities.recommendations[recommendationId] = recommendation;
    pushCaseIndex(state.indices.recommendationsByCase, caseId, recommendationId);
    const rolloutId = nextId(state, "rollout");
    const rollout = {
        id: rolloutId,
        caseId,
        ruleProposalId: proposal.id,
        deploymentRecommendationId: recommendationId,
        currentStage: "shadow",
        canaryTrafficPercent: 5,
        predictedNoise: recommendation.predictedNoise,
        observedNoise: null,
        observedNoiseDelta: null,
        analystAcceptanceRate: recommendation.analystAcceptanceRate,
        requiresManualPromotion: true,
        shadowStartedAtUtc: now,
        canaryStartedAtUtc: null,
        promotedAtUtc: null,
        rolledBackAtUtc: null,
        lastStageReason: input.notes ?? "Simulation created rollout plan.",
        lastOverrideReason: null,
        createdAtUtc: now,
        updatedAtUtc: now
    };
    state.entities.rollouts[rolloutId] = rollout;
    pushCaseIndex(state.indices.rolloutsByCase, caseId, rolloutId);
    const rollbackId = nextId(state, "rollback");
    const rollback = {
        id: rollbackId,
        caseId,
        ruleProposalId: proposal.id,
        rolloutPlanId: rolloutId,
        triggerCondition: "observed_noise_delta > 0.10 OR analyst_acceptance_rate < 0.6",
        recoveryPlaybook: "Revert to prior detector version, freeze promotion, and notify lead/admin approvers.",
        predictedNoiseThreshold: Number.parseFloat((recommendation.predictedNoise + 0.12).toFixed(3)),
        lastObservedNoise: null,
        triggerConditionMet: false,
        isTriggered: false,
        triggeredByUserId: null,
        triggeredAtUtc: null,
        triggerReason: null,
        createdAtUtc: now,
        updatedAtUtc: now
    };
    state.entities.rollbacks[rollbackId] = rollback;
    pushCaseIndex(state.indices.rollbacksByCase, caseId, rollbackId);
    appendEvent(state, caseId, "rule_proposal_simulated", input.actorUserId, `Proposal ${proposal.proposalName} simulated for ${input.targetEnvironment}.`, {
        proposalId: proposal.id,
        rolloutPlanId: rolloutId,
        rollbackPlanId: rollbackId
    });
    updateCaseTouch(state, caseId, "AwaitingApproval");
    return {
        proposal,
        recommendation,
        rolloutPlan: rollout,
        rollbackPlan: rollback
    };
}
function ensureDeploymentForRollout(state, rollout, actorUserId) {
    const existing = (state.indices.deploymentsByCase[rollout.caseId] ?? []).map((id)=>state.entities.deployments[id]).find((item)=>item.ruleId === rollout.ruleProposalId);
    if (existing) {
        return existing;
    }
    const rules = state.indices.rulesByCase[rollout.caseId] ?? [];
    const linkedRuleId = rules[0] ?? nextId(state, "rule-placeholder");
    const now = nowUtc(state);
    const deployment = {
        id: nextId(state, "deployment"),
        caseId: rollout.caseId,
        ruleId: linkedRuleId,
        targetEnvironment: "production",
        status: "Shadow",
        requestedByUserId: actorUserId,
        approvedByUserId: null,
        approvedAtUtc: null,
        deployedAtUtc: null,
        createdAtUtc: now,
        updatedAtUtc: now
    };
    state.entities.deployments[deployment.id] = deployment;
    pushCaseIndex(state.indices.deploymentsByCase, rollout.caseId, deployment.id);
    return deployment;
}
function advanceRolloutStage(state, rolloutPlanId, input) {
    const rollout = state.entities.rollouts[rolloutPlanId];
    if (!rollout) {
        throw new Error("Rollout plan not found.");
    }
    const now = nowUtc(state);
    rollout.currentStage = input.stage;
    rollout.updatedAtUtc = now;
    rollout.lastStageReason = input.reason;
    rollout.lastOverrideReason = input.overrideReason ?? null;
    if (input.stage === "canary") {
        rollout.canaryStartedAtUtc = now;
        rollout.canaryTrafficPercent = Math.max(rollout.canaryTrafficPercent, 15);
    }
    if (input.stage === "promote") {
        rollout.promotedAtUtc = now;
        rollout.canaryTrafficPercent = 100;
    }
    if (input.stage === "rollback") {
        rollout.rolledBackAtUtc = now;
    }
    const deployment = ensureDeploymentForRollout(state, rollout, input.actorUserId);
    deployment.status = input.stage === "promote" ? "Promoted" : input.stage === "rollback" ? "Rollback" : input.stage === "canary" ? "Canary" : "Shadow";
    deployment.updatedAtUtc = now;
    if (input.stage === "promote" || input.stage === "canary") {
        deployment.approvedByUserId = input.actorUserId;
        deployment.approvedAtUtc = now;
        deployment.deployedAtUtc = now;
    }
    const proposal = state.entities.ruleProposals[rollout.ruleProposalId];
    if (proposal) {
        proposal.status = input.stage === "promote" ? "Promoted" : input.stage === "rollback" ? "RolledBack" : input.stage === "canary" ? "Canary" : "Simulated";
        proposal.updatedAtUtc = now;
    }
    const rollback = (state.indices.rollbacksByCase[rollout.caseId] ?? []).map((id)=>state.entities.rollbacks[id]).find((item)=>item.rolloutPlanId === rollout.id);
    if (rollback && input.stage === "rollback") {
        rollback.isTriggered = true;
        rollback.triggerConditionMet = true;
        rollback.triggeredByUserId = input.actorUserId;
        rollback.triggeredAtUtc = now;
        rollback.triggerReason = input.reason;
        rollback.updatedAtUtc = now;
    }
    appendEvent(state, rollout.caseId, "rollout_advanced", input.actorUserId, `Rollout advanced to ${input.stage}.`, {
        rolloutPlanId,
        stage: input.stage
    });
    updateCaseTouch(state, rollout.caseId, input.stage === "promote" ? "Approved" : input.stage === "rollback" ? "Investigating" : "AwaitingApproval");
    return rollout;
}
function recordCanaryObservation(state, rolloutPlanId, input) {
    const rollout = state.entities.rollouts[rolloutPlanId];
    if (!rollout) {
        throw new Error("Rollout plan not found.");
    }
    const now = nowUtc(state);
    rollout.observedNoise = input.observedNoise;
    rollout.observedNoiseDelta = Number.parseFloat((input.observedNoise - rollout.predictedNoise).toFixed(3));
    rollout.analystAcceptanceRate = input.analystReviewedCount === 0 ? 0 : input.analystAcceptedCount / input.analystReviewedCount;
    rollout.updatedAtUtc = now;
    const rollback = (state.indices.rollbacksByCase[rollout.caseId] ?? []).map((id)=>state.entities.rollbacks[id]).find((item)=>item.rolloutPlanId === rollout.id);
    if (rollback) {
        rollback.lastObservedNoise = input.observedNoise;
        rollback.triggerConditionMet = input.observedNoise >= rollback.predictedNoiseThreshold;
        rollback.updatedAtUtc = now;
    }
    appendEvent(state, rollout.caseId, "canary_observation_recorded", input.actorUserId, `Canary observation recorded (${Math.round(input.observedNoise * 100)}% noise).`, {
        rolloutPlanId,
        observedNoise: String(input.observedNoise)
    });
    updateCaseTouch(state, rollout.caseId);
    return rollout;
}
function triggerRollback(state, rollbackPlanId, input) {
    const rollback = state.entities.rollbacks[rollbackPlanId];
    if (!rollback) {
        throw new Error("Rollback plan not found.");
    }
    const now = nowUtc(state);
    rollback.isTriggered = true;
    rollback.triggerConditionMet = true;
    rollback.triggeredByUserId = input.actorUserId;
    rollback.triggeredAtUtc = now;
    rollback.triggerReason = input.reason;
    rollback.lastObservedNoise = input.observedNoise ?? rollback.lastObservedNoise;
    rollback.updatedAtUtc = now;
    const rollout = state.entities.rollouts[rollback.rolloutPlanId];
    if (rollout) {
        rollout.currentStage = "rollback";
        rollout.rolledBackAtUtc = now;
        rollout.updatedAtUtc = now;
    }
    const proposal = state.entities.ruleProposals[rollback.ruleProposalId];
    if (proposal) {
        proposal.status = "RolledBack";
        proposal.updatedAtUtc = now;
    }
    appendEvent(state, rollback.caseId, "rollback_triggered", input.actorUserId, "Rollback triggered for active rollout plan.", {
        rollbackPlanId,
        reason: input.reason
    });
    updateCaseTouch(state, rollback.caseId, "Investigating");
    return rollback;
}
function appendJob(state, jobType, actor) {
    const start = nowUtc(state);
    const completed = nowUtc(state);
    const job = {
        id: nextId(state, `job:${jobType}`),
        jobType,
        status: "Completed",
        triggeredBy: actor,
        details: "Design/demo model retraining completed with updated analyst feedback weighting.",
        startedAtUtc: start,
        completedAtUtc: completed
    };
    state.entities.jobs[job.id] = job;
    state.indices.jobsByType[jobType] = [
        ...state.indices.jobsByType[jobType] ?? [],
        job.id
    ];
    appendEvent(state, state.indices.caseIds[0] ?? "00000000-0000-4000-8000-000000000000", "job_triggered", actor, `${jobType} triggered from admin controls.`, {
        jobId: job.id,
        jobType
    });
    return job;
}
function runModelRetraining(state, triggeredByUserId) {
    return appendJob(state, "ModelRetraining", triggeredByUserId);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/shared/gateway/mock-gateway.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "MockGateway",
    ()=>MockGateway
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$personas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/mock/personas.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$selectors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/mock/selectors.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/mock/store.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$workflow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/mock/workflow.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/mock/utils.ts [app-client] (ecmascript)");
;
;
;
;
;
function copy(value) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["deepCopy"])(value);
}
function consume(...args) {
    void args.length;
}
function paginate(items, page = 1, pageSize = 20) {
    const boundedPage = Number.isFinite(page) && page > 0 ? page : 1;
    const boundedSize = Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 20;
    const start = (boundedPage - 1) * boundedSize;
    return {
        page: boundedPage,
        pageSize: boundedSize,
        items: items.slice(start, start + boundedSize)
    };
}
function personaForUsername(username) {
    const normalized = username.trim().toLowerCase();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$personas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["listMockPersonas"])().find((item)=>item.username.toLowerCase() === normalized || item.id.toLowerCase() === normalized);
}
function nextUserId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    const suffix = Math.floor(Math.random() * 1_000_000_000_000).toString().padStart(12, "0");
    return `00000000-0000-4000-8000-${suffix}`;
}
const MOCK_ROLES = [
    {
        id: "11111111-1111-4111-8111-111111111111",
        name: "Analyst"
    },
    {
        id: "22222222-2222-4222-8222-222222222222",
        name: "Lead"
    },
    {
        id: "33333333-3333-4333-8333-333333333333",
        name: "Admin"
    }
];
class MockGateway {
    users = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$personas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["listMockPersonas"])().map((persona, index)=>({
            id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
            userName: persona.username,
            email: `${persona.username}@demo.local`,
            displayName: persona.displayName
        }));
    async login(username, _password) {
        consume(_password);
        const persona = personaForUsername(username);
        if (!persona) {
            throw new Error("Unknown design/demo profile. Use one of the listed demo accounts.");
        }
        return (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$personas$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["issuePersonaToken"])(persona);
    }
    async listAlertRegistry(query = {}, _signal) {
        consume(_signal);
        const filtered = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$selectors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectCases"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMockState"])()).filter((item)=>{
            const matchesQ = !query.q || [
                item.title,
                item.summary,
                item.ownerUserId,
                item.approvalTierRequired
            ].some((value)=>value.toLowerCase().includes(query.q.toLowerCase()));
            const matchesStatus = !query.status || item.status.toLowerCase() === query.status.toLowerCase();
            const matchesSeverity = !query.severity || item.priority.toLowerCase() === query.severity.toLowerCase();
            const matchesOwner = !query.ownerUserId || item.ownerUserId.toLowerCase().includes(query.ownerUserId.toLowerCase());
            const updatedAt = Date.parse(item.updatedAtUtc);
            const matchesFrom = !query.fromUtc || updatedAt >= Date.parse(query.fromUtc);
            const matchesTo = !query.toUtc || updatedAt <= Date.parse(query.toUtc);
            return matchesQ && matchesStatus && matchesSeverity && matchesOwner && matchesFrom && matchesTo;
        });
        const page = paginate(filtered, query.page, query.pageSize);
        return {
            items: page.items.map((item)=>({
                    id: item.id,
                    title: item.title,
                    summary: item.summary,
                    severity: item.priority,
                    status: item.status,
                    ownerUserId: item.ownerUserId,
                    approvalTierRequired: item.approvalTierRequired,
                    firstDetectedAtUtc: item.createdAtUtc,
                    lastDetectedAtUtc: item.updatedAtUtc,
                    createdAtUtc: item.createdAtUtc,
                    updatedAtUtc: item.updatedAtUtc
                })),
            totalCount: filtered.length,
            page: page.page,
            pageSize: page.pageSize
        };
    }
    async listAlerts(_signal) {
        consume(_signal);
        return copy((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$selectors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectCases"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMockState"])()));
    }
    async getAlert(alertId, _signal) {
        consume(_signal);
        return copy((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$selectors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectCase"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMockState"])(), alertId));
    }
    async listCases(_signal) {
        return this.listAlerts(_signal);
    }
    async getCase(caseId, _signal) {
        return this.getAlert(caseId, _signal);
    }
    async listEvidence(caseId, _signal) {
        consume(_signal);
        return copy((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$selectors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectEvidence"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMockState"])(), caseId));
    }
    async listDecisions(caseId, _signal) {
        consume(_signal);
        return copy((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$selectors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectDecisions"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMockState"])(), caseId));
    }
    async listRules(caseId, _signal) {
        consume(_signal);
        return copy((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$selectors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectRules"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMockState"])(), caseId));
    }
    async listRuleRepository(_query, _signal) {
        consume(_query, _signal);
        return {
            items: [],
            totalCount: 0,
            page: 1,
            pageSize: 25
        };
    }
    async getRuleDetail(_ruleId, _signal) {
        consume(_ruleId, _signal);
        throw new Error("Rule repository detail is not available in mock gateway.");
    }
    async createRule(_input) {
        consume(_input);
        throw new Error("Rule repository create is not available in mock gateway.");
    }
    async importRuleFile(_input) {
        consume(_input);
        throw new Error("Rule repository import is not available in mock gateway.");
    }
    async updateRule(_ruleId, _input) {
        consume(_ruleId, _input);
        throw new Error("Rule repository update is not available in mock gateway.");
    }
    async listRuleRevisions(_ruleId, _signal) {
        consume(_ruleId, _signal);
        return [];
    }
    async listRuleImportAttempts(_ruleId, _signal) {
        consume(_ruleId, _signal);
        return [];
    }
    async archiveRule(_ruleId, _input) {
        consume(_ruleId, _input);
        throw new Error("Rule repository archive is not available in mock gateway.");
    }
    async restoreRule(_ruleId, _input) {
        consume(_ruleId, _input);
        throw new Error("Rule repository restore is not available in mock gateway.");
    }
    async listDeployments(caseId, _signal) {
        consume(_signal);
        return copy((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$selectors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectDeployments"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMockState"])(), caseId));
    }
    async listAllDeployments(_signal) {
        consume(_signal);
        return copy((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$selectors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectAllDeployments"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMockState"])()));
    }
    async listFeedback(caseId, _signal) {
        consume(_signal);
        return copy((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$selectors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectFeedback"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMockState"])(), caseId));
    }
    async listReports(query = {}, _signal) {
        consume(query, _signal);
        return {
            items: [],
            totalCount: 0,
            page: query.page ?? 1,
            pageSize: query.pageSize ?? 20
        };
    }
    async getPowerBiVisualizationCatalog(_signal) {
        consume(_signal);
        return {
            status: "development_placeholder",
            defaultVisualizationKey: "security-overview",
            message: "Design/demo mode exposes placeholder Power BI metadata only. Configure the ASP.NET backend for live embeds.",
            workspaces: [
                {
                    key: "security-ops",
                    displayName: "Security Operations",
                    description: "Placeholder workspace for development shells.",
                    workspaceId: ""
                }
            ],
            visualizations: [
                {
                    key: "security-overview",
                    title: "Security Overview",
                    description: "Executive posture, alert pressure, and detection volume.",
                    workspaceKey: "security-ops",
                    workspaceName: "Security Operations",
                    workspaceId: "",
                    reportId: "",
                    embedUrl: "",
                    status: "placeholder",
                    requiresUserSignIn: true,
                    isConfigured: false,
                    isDefault: true,
                    embedHeightPx: 760,
                    tags: [
                        "Executive",
                        "Threat",
                        "Operations"
                    ]
                }
            ]
        };
    }
    async listAuditLogs(query = {}, _signal) {
        consume(query, _signal);
        return {
            items: [],
            totalCount: 0,
            page: query.page ?? 1,
            pageSize: query.pageSize ?? 20
        };
    }
    async listJobRuns(_signal) {
        consume(_signal);
        return copy((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$selectors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectJobRuns"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMockState"])()));
    }
    async listUsers(_signal) {
        consume(_signal);
        return copy(this.users);
    }
    async listRoles(_signal) {
        consume(_signal);
        return copy(MOCK_ROLES);
    }
    async createUser(input) {
        const created = {
            id: nextUserId(),
            userName: input.userName.trim(),
            email: input.email.trim(),
            displayName: input.displayName.trim()
        };
        this.users = [
            created,
            ...this.users
        ];
        return copy(created);
    }
    async listSubnets(_signal) {
        consume(_signal);
        return [];
    }
    async listFeedSources(_signal) {
        consume(_signal);
        return [];
    }
    async listIocs(query = {}, _signal) {
        consume(query, _signal);
        return {
            items: [],
            totalCount: 0,
            page: query.page ?? 1,
            pageSize: query.pageSize ?? 20
        };
    }
    async listTargetServers(_subnetId, _signal) {
        consume(_subnetId, _signal);
        return [];
    }
    async listTargetGroups(_signal) {
        consume(_signal);
        return [];
    }
    async listTargetGroupMembers(_targetGroupId, _signal) {
        consume(_targetGroupId, _signal);
        return [];
    }
    async listDistributionJobs(_filters, _signal) {
        consume(_filters, _signal);
        throw new Error("Rule distribution jobs are not available in mock gateway.");
    }
    async getDistributionJob(_jobId, _signal) {
        consume(_jobId, _signal);
        throw new Error("Rule distribution jobs are not available in mock gateway.");
    }
    async listDistributionJobAttempts(_jobId, _signal) {
        consume(_jobId, _signal);
        throw new Error("Rule distribution jobs are not available in mock gateway.");
    }
    async listDistributionJobTargets(_jobId, _signal) {
        consume(_jobId, _signal);
        throw new Error("Rule distribution jobs are not available in mock gateway.");
    }
    async createDistributionJob(_input) {
        consume(_input);
        throw new Error("Rule distribution jobs are not available in mock gateway.");
    }
    async retryDistributionJob(_jobId, _input) {
        consume(_jobId, _input);
        throw new Error("Rule distribution jobs are not available in mock gateway.");
    }
    async listScanPlans(_signal) {
        consume(_signal);
        return [];
    }
    async getScanPlan(_scanPlanId, _signal) {
        consume(_scanPlanId, _signal);
        throw new Error("Scan plans are not available in mock gateway.");
    }
    async createScanPlan(_input) {
        consume(_input);
        throw new Error("Scan plans are not available in mock gateway.");
    }
    async updateScanPlan(_scanPlanId, _input) {
        consume(_scanPlanId, _input);
        throw new Error("Scan plans are not available in mock gateway.");
    }
    async runScanPlan(_scanPlanId, _actorUserId, _triggerSource) {
        consume(_scanPlanId, _actorUserId, _triggerSource);
        throw new Error("Scan execution is not available in mock gateway.");
    }
    async listScanJobs(_filters, _signal) {
        consume(_filters, _signal);
        return [];
    }
    async getScanJob(_scanJobId, _signal) {
        consume(_scanJobId, _signal);
        throw new Error("Scan jobs are not available in mock gateway.");
    }
    async listScanJobTargets(_scanJobId, _signal) {
        consume(_scanJobId, _signal);
        return [];
    }
    async cancelScanJob(_scanJobId, _actorUserId, _reason) {
        consume(_scanJobId, _actorUserId, _reason);
        throw new Error("Scan execution is not available in mock gateway.");
    }
    async listManagedServers(_filters, _signal) {
        consume(_filters, _signal);
        return {
            servers: [],
            totalServers: 0,
            unhealthyServers: 0,
            unreachableServers: 0,
            staleContactServers: 0,
            page: _filters?.page ?? 1,
            pageSize: _filters?.pageSize ?? 20
        };
    }
    async getManagedServer(_targetServerId, _signal) {
        consume(_targetServerId, _signal);
        throw new Error("Managed server detail is not available in mock gateway.");
    }
    async createManagedServer(_input) {
        consume(_input);
        throw new Error("Managed server registration is not available in mock gateway.");
    }
    async updateManagedServer(_targetServerId, _input) {
        consume(_targetServerId, _input);
        throw new Error("Managed server update is not available in mock gateway.");
    }
    async rotateManagedServerConnectionSecret(_targetServerId, _input) {
        consume(_targetServerId, _input);
        throw new Error("Managed server secret rotation is not available in mock gateway.");
    }
    async upsertManagedServerScannerAssignment(_targetServerId, _scannerId, _input) {
        consume(_targetServerId, _scannerId, _input);
        throw new Error("Scanner assignment is not available in mock gateway.");
    }
    async removeManagedServerScannerAssignment(_targetServerId, _scannerId) {
        consume(_targetServerId, _scannerId);
        throw new Error("Scanner assignment is not available in mock gateway.");
    }
    async listScanners(_signal) {
        consume(_signal);
        return [];
    }
    async queueDiscoveryRun(_input) {
        consume(_input);
        throw new Error("Discovery queue is not available in mock gateway.");
    }
    async listDiscoveryRuns(_subnetId, _signal) {
        consume(_subnetId, _signal);
        return [];
    }
    async listDiscoveredHosts(_subnetId, _signal) {
        consume(_subnetId, _signal);
        return [];
    }
    async listDetections(query = {}, _signal) {
        consume(query, _signal);
        const page = query.page ?? 1;
        const pageSize = query.pageSize ?? 20;
        return {
            total: 0,
            take: pageSize,
            skip: (Math.max(1, page) - 1) * pageSize,
            items: []
        };
    }
    async promoteDiscoveredHost(_discoveredHostId, _input) {
        consume(_discoveredHostId, _input);
        throw new Error("Discovery promotion is not available in mock gateway.");
    }
    async getHealthInfo(_signal) {
        consume(_signal);
        const state = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMockState"])();
        return {
            service: "IoC Manager Mock Gateway",
            environment: "frontend-prototype",
            utcNow: state.meta.referenceUtc
        };
    }
    async getHealthReady(_signal) {
        consume(_signal);
        return {
            status: "ready",
            components: [
                {
                    name: "database",
                    status: "healthy",
                    required: true,
                    message: "Database reachable."
                },
                {
                    name: "ai_sidecar",
                    status: "healthy",
                    required: false,
                    message: "AI sidecar reachable."
                }
            ]
        };
    }
    async getHealthAdmin(_signal) {
        consume(_signal);
        return {
            runtime: "nextjs",
            machineName: "frontend-prototype-node",
            processId: 1
        };
    }
    async getAlertRuleWorkflow(alertId, _signal) {
        consume(_signal);
        return copy((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$selectors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectCaseRuleWorkflow"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMockState"])(), alertId));
    }
    async getCaseRuleWorkflow(caseId, _signal) {
        return this.getAlertRuleWorkflow(caseId, _signal);
    }
    async createRuleProposal(input) {
        return copy((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["withMockState"])((state)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$workflow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createRuleProposal"])(state, input)));
    }
    async reviewRuleProposal(proposalId, input) {
        return copy((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["withMockState"])((state)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$workflow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["reviewRuleProposal"])(state, proposalId, input)));
    }
    async simulateRuleProposal(proposalId, input) {
        return copy((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["withMockState"])((state)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$workflow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["simulateRuleProposal"])(state, proposalId, input)));
    }
    async advanceRolloutStage(rolloutPlanId, input) {
        return copy((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["withMockState"])((state)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$workflow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["advanceRolloutStage"])(state, rolloutPlanId, input)));
    }
    async recordCanaryObservation(rolloutPlanId, input) {
        return copy((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["withMockState"])((state)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$workflow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["recordCanaryObservation"])(state, rolloutPlanId, input)));
    }
    async triggerRollback(rollbackPlanId, input) {
        return copy((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["withMockState"])((state)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$workflow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["triggerRollback"])(state, rollbackPlanId, input)));
    }
    async getCaseDetail(caseId, _signal) {
        consume(_signal);
        return copy((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$selectors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectCaseDetail"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMockState"])(), caseId));
    }
    async getOverview(_signal) {
        consume(_signal);
        return copy((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$selectors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectOverview"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMockState"])()));
    }
    async getProblematicQueue(_signal) {
        consume(_signal);
        return copy((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$selectors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectProblematicQueue"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMockState"])()));
    }
    async getReportsIngestion(_signal) {
        consume(_signal);
        return copy((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$selectors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectReportsIngestion"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMockState"])()));
    }
    async getGraphRelationships(caseId, _signal) {
        consume(_signal);
        return copy((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$selectors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectGraphRelationships"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMockState"])(), caseId));
    }
    async getSettingsAdmin(_signal) {
        consume(_signal);
        return copy((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$selectors$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["selectSettingsAdmin"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getMockState"])()));
    }
    async runModelRetraining(triggeredByUserId) {
        return copy((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$store$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["withMockState"])((state)=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$mock$2f$workflow$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["runModelRetraining"])(state, triggeredByUserId)));
    }
    async getCoveragePainAnalysis(_input, _signal) {
        consume(_input, _signal);
        throw new Error("Coverage pain analysis is not available in mock gateway.");
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/shared/gateway/index.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "augmentedGateway",
    ()=>augmentedGateway,
    "gateway",
    ()=>gateway,
    "isAspNetMode",
    ()=>isAspNetMode,
    "isMockMode",
    ()=>isMockMode,
    "isModeConfigured",
    ()=>isModeConfigured,
    "mockGateway",
    ()=>mockGateway,
    "rawGateway",
    ()=>rawGateway,
    "runtimeMode",
    ()=>runtimeMode
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$polyfills$2f$process$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = /*#__PURE__*/ __turbopack_context__.i("[project]/node_modules/next/dist/build/polyfills/process.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$aspnet$2d$gateway$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/gateway/aspnet-gateway.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$augmented$2d$gateway$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/gateway/augmented-gateway.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$mock$2d$gateway$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/gateway/mock-gateway.ts [app-client] (ecmascript)");
;
;
;
const source = new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$aspnet$2d$gateway$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AspNetGateway"]();
const modeFlag = ("TURBOPACK compile-time value", "1")?.trim();
const runtimeMode = modeFlag === "0" ? "demo" : modeFlag === undefined || modeFlag === "" || modeFlag === "1" ? "aspnet" : "misconfigured";
const isModeConfigured = runtimeMode !== "misconfigured";
const isMockMode = runtimeMode === "demo";
const isAspNetMode = runtimeMode === "aspnet";
const mock = runtimeMode === "demo" ? new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$mock$2d$gateway$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["MockGateway"]() : null;
const augmented = runtimeMode === "demo" ? new __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$augmented$2d$gateway$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AugmentedGateway"](source) : null;
const gateway = isMockMode ? mock : source;
const rawGateway = source;
const mockGateway = mock;
const augmentedGateway = augmented;
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/shared/query/use-workbench-query.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "useWorkbenchQuery",
    ()=>useWorkbenchQuery
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@tanstack/react-query/build/modern/useQuery.js [app-client] (ecmascript)");
var _s = __turbopack_context__.k.signature();
"use client";
;
function useWorkbenchQuery(key, query, options) {
    _s();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"])({
        queryKey: key,
        queryFn: {
            "useWorkbenchQuery.useQuery": ({ signal })=>query(signal)
        }["useWorkbenchQuery.useQuery"],
        ...options
    });
}
_s(useWorkbenchQuery, "4ZpngI1uv+Uo3WQHEZmTQ5FNM+k=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$tanstack$2f$react$2d$query$2f$build$2f$modern$2f$useQuery$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useQuery"]
    ];
});
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/workbench/command-palette.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "WorkbenchCommandPalette",
    ()=>WorkbenchCommandPalette
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$compass$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Compass$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/compass.js [app-client] (ecmascript) <export default as Compass>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$funnel$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Filter$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/funnel.js [app-client] (ecmascript) <export default as Filter>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/search.js [app-client] (ecmascript) <export default as Search>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2d$code$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__SearchCode$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/search-code.js [app-client] (ecmascript) <export default as SearchCode>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$command$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/command.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$nav$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/workbench/nav.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$workbench$2d$route$2d$meta$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/workbench/workbench-route-meta.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/gateway/index.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/query/use-workbench-query.ts [app-client] (ecmascript)");
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
const alertIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function WorkbenchCommandPalette({ open, onOpenChange }) {
    _s();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const [query, setQuery] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])("");
    const alertsQuery = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"])([
        "shell",
        "command-palette",
        "alerts"
    ], {
        "WorkbenchCommandPalette.useWorkbenchQuery[alertsQuery]": (signal)=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["gateway"].listAlerts(signal)
    }["WorkbenchCommandPalette.useWorkbenchQuery[alertsQuery]"]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "WorkbenchCommandPalette.useEffect": ()=>{
            const onKeyDown = {
                "WorkbenchCommandPalette.useEffect.onKeyDown": (event)=>{
                    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
                        event.preventDefault();
                        onOpenChange(!open);
                    }
                }
            }["WorkbenchCommandPalette.useEffect.onKeyDown"];
            window.addEventListener("keydown", onKeyDown);
            return ({
                "WorkbenchCommandPalette.useEffect": ()=>window.removeEventListener("keydown", onKeyDown)
            })["WorkbenchCommandPalette.useEffect"];
        }
    }["WorkbenchCommandPalette.useEffect"], [
        onOpenChange,
        open
    ]);
    const normalizedQuery = query.trim();
    const commandLabel = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "WorkbenchCommandPalette.useMemo[commandLabel]": ()=>{
            if (!alertIdPattern.test(normalizedQuery)) {
                return null;
            }
            return `${normalizedQuery.slice(0, 8)}...${normalizedQuery.slice(-4)}`;
        }
    }["WorkbenchCommandPalette.useMemo[commandLabel]"], [
        normalizedQuery
    ]);
    const routeItems = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "WorkbenchCommandPalette.useMemo[routeItems]": ()=>{
            const search = normalizedQuery.toLowerCase();
            return __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$workbench$2d$route$2d$meta$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["WORKBENCH_ROUTES"].filter({
                "WorkbenchCommandPalette.useMemo[routeItems]": (item)=>{
                    if (!search) {
                        return true;
                    }
                    return [
                        item.label,
                        ...item.commandAliases,
                        ...item.aliases
                    ].some({
                        "WorkbenchCommandPalette.useMemo[routeItems]": (token)=>token.toLowerCase().includes(search)
                    }["WorkbenchCommandPalette.useMemo[routeItems]"]);
                }
            }["WorkbenchCommandPalette.useMemo[routeItems]"]);
        }
    }["WorkbenchCommandPalette.useMemo[routeItems]"], [
        normalizedQuery
    ]);
    const alertItems = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "WorkbenchCommandPalette.useMemo[alertItems]": ()=>{
            if (!alertsQuery.data || normalizedQuery.length === 0) {
                return [];
            }
            const search = normalizedQuery.toLowerCase();
            return [
                ...alertsQuery.data
            ].sort({
                "WorkbenchCommandPalette.useMemo[alertItems]": (left, right)=>Date.parse(right.updatedAtUtc) - Date.parse(left.updatedAtUtc)
            }["WorkbenchCommandPalette.useMemo[alertItems]"]).filter({
                "WorkbenchCommandPalette.useMemo[alertItems]": (item)=>{
                    const haystack = [
                        item.id,
                        item.title,
                        item.priority
                    ].join(" ").toLowerCase();
                    return haystack.includes(search);
                }
            }["WorkbenchCommandPalette.useMemo[alertItems]"]).slice(0, 6);
        }
    }["WorkbenchCommandPalette.useMemo[alertItems]"], [
        alertsQuery.data,
        normalizedQuery
    ]);
    function navigate(href) {
        onOpenChange(false);
        setQuery("");
        router.push(href);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$command$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CommandDialog"], {
        open: open,
        onOpenChange: (next)=>{
            onOpenChange(next);
            if (!next) {
                setQuery("");
            }
        },
        title: "IoC Manager Command Palette",
        description: "Navigate IoC Manager views and operational shortcuts.",
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$command$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Command"], {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$command$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CommandInput"], {
                    value: query,
                    onValueChange: setQuery,
                    placeholder: "Search routes, queue focus, alert ids, and alert titles..."
                }, void 0, false, {
                    fileName: "[project]/src/components/workbench/command-palette.tsx",
                    lineNumber: 100,
                    columnNumber: 9
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$command$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CommandList"], {
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$command$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CommandEmpty"], {
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "space-y-1",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-sm font-medium",
                                        children: "No matching command"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/command-palette.tsx",
                                        lineNumber: 108,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "text-xs text-muted-foreground",
                                        children: "Try route names, queue states, alert ids, or free text."
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/command-palette.tsx",
                                        lineNumber: 109,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/command-palette.tsx",
                                lineNumber: 107,
                                columnNumber: 13
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/components/workbench/command-palette.tsx",
                            lineNumber: 106,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$command$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CommandGroup"], {
                            heading: "Navigate",
                            children: routeItems.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$command$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CommandItem"], {
                                    onSelect: ()=>navigate(item.href),
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(item.icon, {
                                            className: "h-4 w-4"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/command-palette.tsx",
                                            lineNumber: 116,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "min-w-0",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "truncate text-sm",
                                                    children: item.label
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/command-palette.tsx",
                                                    lineNumber: 118,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "truncate text-[11px] text-muted-foreground",
                                                    children: item.commandAliases.join(" · ")
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/command-palette.tsx",
                                                    lineNumber: 119,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/workbench/command-palette.tsx",
                                            lineNumber: 117,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$command$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CommandShortcut"], {
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$compass$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Compass$3e$__["Compass"], {
                                                className: "h-3.5 w-3.5"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/command-palette.tsx",
                                                lineNumber: 122,
                                                columnNumber: 19
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/command-palette.tsx",
                                            lineNumber: 121,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, item.href, true, {
                                    fileName: "[project]/src/components/workbench/command-palette.tsx",
                                    lineNumber: 115,
                                    columnNumber: 15
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/components/workbench/command-palette.tsx",
                            lineNumber: 113,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$command$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CommandSeparator"], {}, void 0, false, {
                            fileName: "[project]/src/components/workbench/command-palette.tsx",
                            lineNumber: 128,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$command$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CommandGroup"], {
                            heading: "Queue Focus",
                            children: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$nav$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QUEUE_FOCUS_ITEMS"].map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$command$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CommandItem"], {
                                    onSelect: ()=>navigate(item.href),
                                    children: [
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$funnel$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Filter$3e$__["Filter"], {
                                            className: "h-4 w-4"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/command-palette.tsx",
                                            lineNumber: 133,
                                            columnNumber: 17
                                        }, this),
                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "min-w-0",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "truncate text-sm",
                                                    children: item.label
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/command-palette.tsx",
                                                    lineNumber: 135,
                                                    columnNumber: 19
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                    className: "truncate text-[11px] text-muted-foreground",
                                                    children: item.description
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/command-palette.tsx",
                                                    lineNumber: 136,
                                                    columnNumber: 19
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/workbench/command-palette.tsx",
                                            lineNumber: 134,
                                            columnNumber: 17
                                        }, this)
                                    ]
                                }, item.key, true, {
                                    fileName: "[project]/src/components/workbench/command-palette.tsx",
                                    lineNumber: 132,
                                    columnNumber: 15
                                }, this))
                        }, void 0, false, {
                            fileName: "[project]/src/components/workbench/command-palette.tsx",
                            lineNumber: 130,
                            columnNumber: 11
                        }, this),
                        alertItems.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$command$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CommandSeparator"], {}, void 0, false, {
                                    fileName: "[project]/src/components/workbench/command-palette.tsx",
                                    lineNumber: 144,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$command$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CommandGroup"], {
                                    heading: "Alerts",
                                    children: alertItems.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$command$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CommandItem"], {
                                            onSelect: ()=>navigate(`/alerts/${item.id}`),
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2d$code$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__SearchCode$3e$__["SearchCode"], {
                                                    className: "h-4 w-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/command-palette.tsx",
                                                    lineNumber: 148,
                                                    columnNumber: 21
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "min-w-0",
                                                    children: [
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "truncate text-sm",
                                                            children: item.title
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/workbench/command-palette.tsx",
                                                            lineNumber: 150,
                                                            columnNumber: 23
                                                        }, this),
                                                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                            className: "truncate text-[11px] text-muted-foreground",
                                                            children: [
                                                                item.id.slice(0, 8),
                                                                " · ",
                                                                item.priority
                                                            ]
                                                        }, void 0, true, {
                                                            fileName: "[project]/src/components/workbench/command-palette.tsx",
                                                            lineNumber: 151,
                                                            columnNumber: 23
                                                        }, this)
                                                    ]
                                                }, void 0, true, {
                                                    fileName: "[project]/src/components/workbench/command-palette.tsx",
                                                    lineNumber: 149,
                                                    columnNumber: 21
                                                }, this)
                                            ]
                                        }, item.id, true, {
                                            fileName: "[project]/src/components/workbench/command-palette.tsx",
                                            lineNumber: 147,
                                            columnNumber: 19
                                        }, this))
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/command-palette.tsx",
                                    lineNumber: 145,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true) : null,
                        commandLabel ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$command$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CommandSeparator"], {}, void 0, false, {
                                    fileName: "[project]/src/components/workbench/command-palette.tsx",
                                    lineNumber: 163,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$command$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CommandGroup"], {
                                    heading: "Open Alert",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$command$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CommandItem"], {
                                        onSelect: ()=>navigate(`/alerts/${normalizedQuery}`),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2d$code$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__SearchCode$3e$__["SearchCode"], {
                                                className: "h-4 w-4"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/command-palette.tsx",
                                                lineNumber: 166,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-sm",
                                                        children: [
                                                            "Open alert ",
                                                            commandLabel
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/workbench/command-palette.tsx",
                                                        lineNumber: 168,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-[11px] text-muted-foreground",
                                                        children: "Direct jump to alert detail"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/command-palette.tsx",
                                                        lineNumber: 169,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/workbench/command-palette.tsx",
                                                lineNumber: 167,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/command-palette.tsx",
                                        lineNumber: 165,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/command-palette.tsx",
                                    lineNumber: 164,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true) : null,
                        normalizedQuery.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Fragment"], {
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$command$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CommandSeparator"], {}, void 0, false, {
                                    fileName: "[project]/src/components/workbench/command-palette.tsx",
                                    lineNumber: 178,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$command$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CommandGroup"], {
                                    heading: "Search Queue",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$command$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CommandItem"], {
                                        onSelect: ()=>navigate(`/queue?q=${encodeURIComponent(normalizedQuery)}`),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__["Search"], {
                                                className: "h-4 w-4"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/command-palette.tsx",
                                                lineNumber: 181,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-sm",
                                                        children: [
                                                            'Search queue for "',
                                                            normalizedQuery,
                                                            '"'
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/workbench/command-palette.tsx",
                                                        lineNumber: 183,
                                                        columnNumber: 21
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-[11px] text-muted-foreground",
                                                        children: "Full-text filter in triage queue"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/command-palette.tsx",
                                                        lineNumber: 184,
                                                        columnNumber: 21
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/workbench/command-palette.tsx",
                                                lineNumber: 182,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/command-palette.tsx",
                                        lineNumber: 180,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/command-palette.tsx",
                                    lineNumber: 179,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true) : null
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/components/workbench/command-palette.tsx",
                    lineNumber: 105,
                    columnNumber: 9
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/components/workbench/command-palette.tsx",
            lineNumber: 99,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/workbench/command-palette.tsx",
        lineNumber: 88,
        columnNumber: 5
    }, this);
}
_s(WorkbenchCommandPalette, "PZipL4SakPSCPOvuM6VUNppj7VQ=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"]
    ];
});
_c = WorkbenchCommandPalette;
var _c;
__turbopack_context__.k.register(_c, "WorkbenchCommandPalette");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/workbench/workbench-shell-storage.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "pushRecentWorkbenchItem",
    ()=>pushRecentWorkbenchItem,
    "readPinnedWorkbenchItems",
    ()=>readPinnedWorkbenchItems,
    "readRecentWorkbenchItems",
    ()=>readRecentWorkbenchItems,
    "togglePinnedAlert",
    ()=>togglePinnedAlert,
    "togglePinnedCase",
    ()=>togglePinnedCase,
    "writePinnedWorkbenchItems",
    ()=>writePinnedWorkbenchItems,
    "writeRecentWorkbenchItems",
    ()=>writeRecentWorkbenchItems
]);
const PINNED_STORAGE_KEY = "ioc.manager.pinned";
const RECENT_STORAGE_KEY = "ioc.manager.recent";
const LEGACY_PINNED_STORAGE_KEY = "cti.workbench.pinned";
const LEGACY_RECENT_STORAGE_KEY = "cti.workbench.recent";
function parseJson(value, fallback) {
    if (!value) {
        return fallback;
    }
    try {
        return JSON.parse(value);
    } catch  {
        return fallback;
    }
}
function canUseStorage() {
    return ("TURBOPACK compile-time value", "object") !== "undefined" && typeof window.localStorage !== "undefined";
}
function readPinnedWorkbenchItems() {
    if (!canUseStorage()) {
        return [];
    }
    const stored = window.localStorage.getItem(PINNED_STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_PINNED_STORAGE_KEY);
    const parsed = parseJson(stored, []);
    return parsed.map((item)=>{
        const resolvedId = "alertId" in item && typeof item.alertId === "string" ? item.alertId : "caseId" in item && typeof item.caseId === "string" ? item.caseId : null;
        if (!resolvedId) {
            return null;
        }
        return {
            kind: "alert",
            alertId: resolvedId,
            pinnedAtUtc: item.pinnedAtUtc ?? new Date().toISOString()
        };
    }).filter((item)=>Boolean(item));
}
function writePinnedWorkbenchItems(items) {
    if (!canUseStorage()) {
        return;
    }
    window.localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(items));
}
function togglePinnedAlert(items, alertId) {
    const existing = items.find((item)=>item.alertId === alertId);
    if (existing) {
        return items.filter((item)=>item.alertId !== alertId);
    }
    return [
        {
            kind: "alert",
            alertId,
            pinnedAtUtc: new Date().toISOString()
        },
        ...items
    ];
}
const togglePinnedCase = togglePinnedAlert;
function readRecentWorkbenchItems() {
    if (!canUseStorage()) {
        return [];
    }
    const stored = window.localStorage.getItem(RECENT_STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_RECENT_STORAGE_KEY);
    const parsed = parseJson(stored, []);
    return parsed.filter((item)=>typeof item.key === "string" && typeof item.href === "string");
}
function writeRecentWorkbenchItems(items) {
    if (!canUseStorage()) {
        return;
    }
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(items));
}
function pushRecentWorkbenchItem(current, next, limit = 10) {
    const deduped = current.filter((item)=>item.key !== next.key);
    return [
        next,
        ...deduped
    ].slice(0, limit);
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/scroll-area.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ScrollArea",
    ()=>ScrollArea,
    "ScrollBar",
    ()=>ScrollBar
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$scroll$2d$area$2f$index$2e$parts$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ScrollArea$3e$__ = __turbopack_context__.i("[project]/node_modules/@base-ui/react/esm/scroll-area/index.parts.js [app-client] (ecmascript) <export * as ScrollArea>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
"use client";
;
;
;
function ScrollArea({ className, children, ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$scroll$2d$area$2f$index$2e$parts$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ScrollArea$3e$__["ScrollArea"].Root, {
        "data-slot": "scroll-area",
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("relative", className),
        ...props,
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$scroll$2d$area$2f$index$2e$parts$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ScrollArea$3e$__["ScrollArea"].Viewport, {
                "data-slot": "scroll-area-viewport",
                className: "size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1",
                children: children
            }, void 0, false, {
                fileName: "[project]/src/components/ui/scroll-area.tsx",
                lineNumber: 19,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ScrollBar, {}, void 0, false, {
                fileName: "[project]/src/components/ui/scroll-area.tsx",
                lineNumber: 25,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$scroll$2d$area$2f$index$2e$parts$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ScrollArea$3e$__["ScrollArea"].Corner, {}, void 0, false, {
                fileName: "[project]/src/components/ui/scroll-area.tsx",
                lineNumber: 26,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/ui/scroll-area.tsx",
        lineNumber: 14,
        columnNumber: 5
    }, this);
}
_c = ScrollArea;
function ScrollBar({ className, orientation = "vertical", ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$scroll$2d$area$2f$index$2e$parts$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ScrollArea$3e$__["ScrollArea"].Scrollbar, {
        "data-slot": "scroll-area-scrollbar",
        "data-orientation": orientation,
        orientation: orientation,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex touch-none p-px transition-colors select-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-l data-vertical:border-l-transparent", className),
        ...props,
        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$scroll$2d$area$2f$index$2e$parts$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__ScrollArea$3e$__["ScrollArea"].Thumb, {
            "data-slot": "scroll-area-thumb",
            className: "relative flex-1 rounded-full bg-border"
        }, void 0, false, {
            fileName: "[project]/src/components/ui/scroll-area.tsx",
            lineNumber: 47,
            columnNumber: 7
        }, this)
    }, void 0, false, {
        fileName: "[project]/src/components/ui/scroll-area.tsx",
        lineNumber: 37,
        columnNumber: 5
    }, this);
}
_c1 = ScrollBar;
;
var _c, _c1;
__turbopack_context__.k.register(_c, "ScrollArea");
__turbopack_context__.k.register(_c1, "ScrollBar");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/ui/separator.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "Separator",
    ()=>Separator
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$separator$2f$Separator$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/@base-ui/react/esm/separator/Separator.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
"use client";
;
;
;
function Separator({ className, orientation = "horizontal", ...props }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$base$2d$ui$2f$react$2f$esm$2f$separator$2f$Separator$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Separator"], {
        "data-slot": "separator",
        orientation: orientation,
        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch", className),
        ...props
    }, void 0, false, {
        fileName: "[project]/src/components/ui/separator.tsx",
        lineNumber: 13,
        columnNumber: 5
    }, this);
}
_c = Separator;
;
var _c;
__turbopack_context__.k.register(_c, "Separator");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/shared/ui/motion.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "motionTransition",
    ()=>motionTransition,
    "pageMotion",
    ()=>pageMotion,
    "panelMotion",
    ()=>panelMotion,
    "staggerMotion",
    ()=>staggerMotion
]);
const motionTransition = {
    duration: 0.26,
    ease: [
        0.16,
        1,
        0.3,
        1
    ]
};
const pageMotion = {
    hidden: {
        opacity: 0,
        y: 8
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: motionTransition
    },
    exit: {
        opacity: 0,
        y: -6,
        transition: {
            ...motionTransition,
            duration: 0.18
        }
    }
};
const staggerMotion = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.04,
            delayChildren: 0.02
        }
    }
};
const panelMotion = {
    hidden: {
        opacity: 0,
        y: 6
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: motionTransition
    }
};
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/components/workbench/app-shell.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "WorkbenchShell",
    ()=>WorkbenchShell
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
/* eslint-disable react-hooks/set-state-in-effect */ var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/app-dir/link.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/navigation.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/components/AnimatePresence/index.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/framer-motion/dist/es/render/components/motion/proxy.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/bell.js [app-client] (ecmascript) <export default as Bell>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2d$3$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock3$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/clock-3.js [app-client] (ecmascript) <export default as Clock3>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$menu$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Menu$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/menu.js [app-client] (ecmascript) <export default as Menu>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$panel$2d$left$2d$close$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__PanelLeftClose$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/panel-left-close.js [app-client] (ecmascript) <export default as PanelLeftClose>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$panel$2d$left$2d$open$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__PanelLeftOpen$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/panel-left-open.js [app-client] (ecmascript) <export default as PanelLeftOpen>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/search.js [app-client] (ecmascript) <export default as Search>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$star$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Star$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/star.js [app-client] (ecmascript) <export default as Star>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$command$2d$palette$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/workbench/command-palette.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$nav$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/workbench/nav.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$workbench$2d$inspector$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/workbench/workbench-inspector.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$workbench$2d$route$2d$meta$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/workbench/workbench-route-meta.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$workbench$2d$shell$2d$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/workbench/workbench-shell-storage.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/button.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$scroll$2d$area$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/scroll-area.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$separator$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/separator.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/components/ui/sheet.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/utils.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$auth$2f$auth$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/auth/auth-provider.tsx [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$auth$2f$session$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/auth/session.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/gateway/index.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/query/use-workbench-query.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$motion$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/ui/motion.ts [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/shared/ui/state-panels.tsx [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature();
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
;
;
;
;
;
;
;
;
function SidebarNav({ collapsed, pathname, onNavigate }) {
    _s();
    const sections = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "SidebarNav.useMemo[sections]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$workbench$2d$route$2d$meta$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["getWorkbenchNavByModule"])()
    }["SidebarNav.useMemo[sections]"], []);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-5",
        children: sections.map((section)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                children: [
                    !collapsed && section.module !== "Core" ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "wb-kicker mb-2 px-2",
                        children: section.module
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                        lineNumber: 77,
                        columnNumber: 54
                    }, this) : null,
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-1.5",
                        children: section.routes.map((item)=>{
                            const active = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$workbench$2d$route$2d$meta$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isWorkbenchNavActive"])(pathname, item.href);
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: item.href,
                                title: collapsed ? item.label : undefined,
                                onClick: onNavigate,
                                className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("group flex h-10 items-center gap-2.5 rounded-lg border px-2.5 text-[13px] transition-colors", active ? "border-primary/45 bg-primary/14 text-foreground shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--foreground)_7%,transparent)]" : "border-transparent text-muted-foreground hover:border-border hover:bg-surface-2 hover:text-foreground", collapsed ? "justify-center px-0" : "justify-start"),
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(item.icon, {
                                        className: "h-4 w-4 shrink-0"
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                                        lineNumber: 95,
                                        columnNumber: 19
                                    }, this),
                                    !collapsed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                        className: "min-w-0 truncate",
                                        children: item.label
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                                        lineNumber: 96,
                                        columnNumber: 33
                                    }, this) : null
                                ]
                            }, item.href, true, {
                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                lineNumber: 82,
                                columnNumber: 17
                            }, this);
                        })
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                        lineNumber: 78,
                        columnNumber: 11
                    }, this)
                ]
            }, section.module, true, {
                fileName: "[project]/src/components/workbench/app-shell.tsx",
                lineNumber: 76,
                columnNumber: 9
            }, this))
    }, void 0, false, {
        fileName: "[project]/src/components/workbench/app-shell.tsx",
        lineNumber: 74,
        columnNumber: 5
    }, this);
}
_s(SidebarNav, "bnDyS95pS2LMHtqqESpx0p97yjI=");
_c = SidebarNav;
function SidebarWorkArea({ collapsed, pinned, recent, onTogglePin }) {
    _s1();
    const alertsQuery = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"])([
        "shell",
        "sidebar",
        "alerts"
    ], {
        "SidebarWorkArea.useWorkbenchQuery[alertsQuery]": (signal)=>__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["gateway"].listAlerts(signal)
    }["SidebarWorkArea.useWorkbenchQuery[alertsQuery]"]);
    const pinnedRows = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "SidebarWorkArea.useMemo[pinnedRows]": ()=>{
            const alerts = alertsQuery.data ?? [];
            return pinned.map({
                "SidebarWorkArea.useMemo[pinnedRows]": (item)=>{
                    const match = alerts.find({
                        "SidebarWorkArea.useMemo[pinnedRows].match": (entry)=>entry.id === item.alertId
                    }["SidebarWorkArea.useMemo[pinnedRows].match"]);
                    return {
                        alertId: item.alertId,
                        href: `/alerts/${item.alertId}`,
                        title: match?.title ?? `Alert ${item.alertId.slice(0, 8)}`,
                        subtitle: match ? `${match.priority} priority` : "Pinned alert"
                    };
                }
            }["SidebarWorkArea.useMemo[pinnedRows]"]);
        }
    }["SidebarWorkArea.useMemo[pinnedRows]"], [
        alertsQuery.data,
        pinned
    ]);
    if (collapsed) {
        return null;
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-4 border-t border-border/65 pt-4",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-2 flex items-center justify-between px-2",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "wb-kicker inline-flex items-center gap-1",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$star$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Star$3e$__["Star"], {
                                    className: "h-3.5 w-3.5"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/app-shell.tsx",
                                    lineNumber: 132,
                                    columnNumber: 13
                                }, this),
                                " Pinned"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/workbench/app-shell.tsx",
                            lineNumber: 131,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                        lineNumber: 130,
                        columnNumber: 9
                    }, this),
                    alertsQuery.isLoading && pinned.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CompactLoadingState"], {
                        label: "Loading pinned alerts"
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                        lineNumber: 136,
                        columnNumber: 55
                    }, this) : null,
                    alertsQuery.isError ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CompactErrorState"], {
                        label: "Pinned alerts unavailable"
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                        lineNumber: 137,
                        columnNumber: 32
                    }, this) : null,
                    !alertsQuery.isError && pinnedRows.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CompactEmptyState"], {
                        label: "No pinned alerts yet."
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                        lineNumber: 139,
                        columnNumber: 60
                    }, this) : null,
                    pinnedRows.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-1.5",
                        children: pinnedRows.slice(0, 4).map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex items-center gap-1.5 rounded-md border border-border/70 bg-surface-2/55 px-2 py-1.5",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                        href: item.href,
                                        className: "min-w-0 flex-1",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "truncate text-[12px] font-medium",
                                                children: item.title
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                lineNumber: 146,
                                                columnNumber: 19
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                className: "truncate text-[10px] text-muted-foreground",
                                                children: item.subtitle
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                lineNumber: 147,
                                                columnNumber: 19
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                                        lineNumber: 145,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                        type: "button",
                                        onClick: ()=>onTogglePin(item.alertId),
                                        className: "inline-flex h-6 w-6 items-center justify-center rounded border border-border/70 bg-surface-1/80 text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground",
                                        "aria-label": `Unpin alert ${item.alertId.slice(0, 8)}`,
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$star$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Star$3e$__["Star"], {
                                            className: "h-3.5 w-3.5 fill-current"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/app-shell.tsx",
                                            lineNumber: 155,
                                            columnNumber: 19
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                                        lineNumber: 149,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, item.alertId, true, {
                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                lineNumber: 144,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                        lineNumber: 142,
                        columnNumber: 11
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/workbench/app-shell.tsx",
                lineNumber: 129,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("section", {
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "mb-2 px-2",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "wb-kicker inline-flex items-center gap-1",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$clock$2d$3$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Clock3$3e$__["Clock3"], {
                                    className: "h-3.5 w-3.5"
                                }, void 0, false, {
                                    fileName: "[project]/src/components/workbench/app-shell.tsx",
                                    lineNumber: 166,
                                    columnNumber: 13
                                }, this),
                                " Recent"
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/components/workbench/app-shell.tsx",
                            lineNumber: 165,
                            columnNumber: 11
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                        lineNumber: 164,
                        columnNumber: 9
                    }, this),
                    recent.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CompactEmptyState"], {
                        label: "No recent items yet."
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                        lineNumber: 170,
                        columnNumber: 32
                    }, this) : null,
                    recent.length > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "space-y-1.5",
                        children: recent.slice(0, 5).map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                href: item.href,
                                className: "block rounded-md border border-border/70 bg-surface-2/55 px-2 py-1.5 transition-colors hover:border-primary/35",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "truncate text-[12px] font-medium",
                                        children: item.label
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                                        lineNumber: 176,
                                        columnNumber: 17
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                        className: "truncate text-[10px] text-muted-foreground",
                                        children: item.subtitle
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                                        lineNumber: 177,
                                        columnNumber: 17
                                    }, this)
                                ]
                            }, item.key, true, {
                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                lineNumber: 175,
                                columnNumber: 15
                            }, this))
                    }, void 0, false, {
                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                        lineNumber: 173,
                        columnNumber: 11
                    }, this) : null
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/workbench/app-shell.tsx",
                lineNumber: 163,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/workbench/app-shell.tsx",
        lineNumber: 128,
        columnNumber: 5
    }, this);
}
_s1(SidebarWorkArea, "f17TVN9WpNSsU3lmmCGnYHc5QVU=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"]
    ];
});
_c1 = SidebarWorkArea;
function SidebarContent({ collapsed, pathname, onNavigate, pinned, recent, onTogglePin }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$scroll$2d$area$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["ScrollArea"], {
        className: "h-full px-2 pb-4 pt-3",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SidebarNav, {
                collapsed: collapsed,
                pathname: pathname,
                onNavigate: onNavigate
            }, void 0, false, {
                fileName: "[project]/src/components/workbench/app-shell.tsx",
                lineNumber: 197,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SidebarWorkArea, {
                collapsed: collapsed,
                pinned: pinned,
                recent: recent,
                onTogglePin: onTogglePin
            }, void 0, false, {
                fileName: "[project]/src/components/workbench/app-shell.tsx",
                lineNumber: 198,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/workbench/app-shell.tsx",
        lineNumber: 196,
        columnNumber: 5
    }, this);
}
_c2 = SidebarContent;
function ShellNotifications({ items, isLoading, hasPartialError, reducedCapability }) {
    if (isLoading) {
        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CompactLoadingState"], {
            label: "Loading notifications"
        }, void 0, false, {
            fileName: "[project]/src/components/workbench/app-shell.tsx",
            lineNumber: 215,
            columnNumber: 12
        }, this);
    }
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "space-y-2 px-4 pb-4",
        children: [
            hasPartialError ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CompactErrorState"], {
                label: "Some feeds unavailable. Showing partial notifications."
            }, void 0, false, {
                fileName: "[project]/src/components/workbench/app-shell.tsx",
                lineNumber: 220,
                columnNumber: 26
            }, this) : null,
            reducedCapability ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "rounded-md border border-border/70 bg-surface-2/55 px-2 py-2 text-[11px] text-muted-foreground",
                children: "Notification feed is intentionally reduced: this panel currently shows only contract-backed job activity."
            }, void 0, false, {
                fileName: "[project]/src/components/workbench/app-shell.tsx",
                lineNumber: 222,
                columnNumber: 9
            }, this) : null,
            items.length === 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$state$2d$panels$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["CompactEmptyState"], {
                label: reducedCapability ? "No recent job activity available in reduced-capability mode." : "No notifications available."
            }, void 0, false, {
                fileName: "[project]/src/components/workbench/app-shell.tsx",
                lineNumber: 227,
                columnNumber: 9
            }, this) : null,
            items.map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                    className: "rounded-lg border border-border/70 bg-surface-2/65 px-3 py-2",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "text-xs font-semibold tracking-tight",
                            children: item.title
                        }, void 0, false, {
                            fileName: "[project]/src/components/workbench/app-shell.tsx",
                            lineNumber: 233,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mt-0.5 text-[11px] text-muted-foreground",
                            children: item.description
                        }, void 0, false, {
                            fileName: "[project]/src/components/workbench/app-shell.tsx",
                            lineNumber: 234,
                            columnNumber: 11
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                            className: "mt-1 text-[10px] text-muted-foreground",
                            children: item.when
                        }, void 0, false, {
                            fileName: "[project]/src/components/workbench/app-shell.tsx",
                            lineNumber: 235,
                            columnNumber: 11
                        }, this)
                    ]
                }, item.id, true, {
                    fileName: "[project]/src/components/workbench/app-shell.tsx",
                    lineNumber: 232,
                    columnNumber: 9
                }, this)),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                className: "text-[11px] text-muted-foreground",
                children: "Notification center is explicitly constrained until a dedicated notification/feed contract is available."
            }, void 0, false, {
                fileName: "[project]/src/components/workbench/app-shell.tsx",
                lineNumber: 238,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/workbench/app-shell.tsx",
        lineNumber: 219,
        columnNumber: 5
    }, this);
}
_c3 = ShellNotifications;
function WorkbenchShell({ children }) {
    _s2();
    const pathname = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"])();
    const router = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"])();
    const { session, signOut } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$auth$2f$auth$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"])();
    const { closeInspector } = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$workbench$2d$inspector$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchInspector"])();
    const [collapsed, setCollapsed] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [mobileOpen, setMobileOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [commandOpen, setCommandOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [notificationOpen, setNotificationOpen] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [pinned, setPinned] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [recent, setRecent] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])([]);
    const [storageReady, setStorageReady] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const resolvedRoute = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "WorkbenchShell.useMemo[resolvedRoute]": ()=>(0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$workbench$2d$route$2d$meta$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["resolveWorkbenchRoute"])(pathname)
    }["WorkbenchShell.useMemo[resolvedRoute]"], [
        pathname
    ]);
    const notificationsQuery = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"])([
        "shell",
        "notifications"
    ], {
        "WorkbenchShell.useWorkbenchQuery[notificationsQuery]": async (signal)=>{
            const jobsResult = await Promise.allSettled([
                __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["gateway"].listJobRuns(signal)
            ]);
            const items = [];
            const reducedCapability = true;
            if (jobsResult[0].status === "fulfilled") {
                for (const job of jobsResult[0].value.slice(0, 3)){
                    items.push({
                        id: `job-${job.id}`,
                        title: `${job.jobType} ${job.status.toLowerCase()}`,
                        description: job.details || "No additional details.",
                        when: new Date(job.startedAtUtc).toLocaleString()
                    });
                }
            }
            return {
                items,
                hasPartialError: jobsResult[0].status === "rejected",
                reducedCapability
            };
        }
    }["WorkbenchShell.useWorkbenchQuery[notificationsQuery]"]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "WorkbenchShell.useEffect": ()=>{
            const root = document.documentElement;
            root.classList.remove("light");
            root.classList.add("dark");
            window.localStorage.removeItem("ioc.manager.theme");
        }
    }["WorkbenchShell.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "WorkbenchShell.useEffect": ()=>{
            setPinned((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$workbench$2d$shell$2d$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["readPinnedWorkbenchItems"])());
            setRecent((0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$workbench$2d$shell$2d$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["readRecentWorkbenchItems"])());
            setStorageReady(true);
        }
    }["WorkbenchShell.useEffect"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "WorkbenchShell.useEffect": ()=>{
            if (!storageReady) {
                return;
            }
            const routeLabel = resolvedRoute.caseId ? `Alert ${resolvedRoute.caseId.slice(0, 8)}` : resolvedRoute.title;
            const entry = {
                key: resolvedRoute.caseId ? `alert:${resolvedRoute.canonicalPath}` : `route:${resolvedRoute.canonicalPath}`,
                kind: resolvedRoute.caseId ? "alert" : "route",
                href: resolvedRoute.canonicalPath,
                label: routeLabel,
                subtitle: resolvedRoute.title,
                visitedAtUtc: new Date().toISOString()
            };
            setRecent({
                "WorkbenchShell.useEffect": (previous)=>{
                    const next = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$workbench$2d$shell$2d$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["pushRecentWorkbenchItem"])(previous, entry, 10);
                    (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$workbench$2d$shell$2d$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["writeRecentWorkbenchItems"])(next);
                    return next;
                }
            }["WorkbenchShell.useEffect"]);
        }
    }["WorkbenchShell.useEffect"], [
        resolvedRoute,
        storageReady
    ]);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "WorkbenchShell.useEffect": ()=>{
            closeInspector();
        }
    }["WorkbenchShell.useEffect"], [
        closeInspector,
        pathname
    ]);
    function handleTogglePin(alertId) {
        setPinned((previous)=>{
            const next = (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$workbench$2d$shell$2d$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["togglePinnedAlert"])(previous, alertId);
            (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$workbench$2d$shell$2d$storage$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["writePinnedWorkbenchItems"])(next);
            return next;
        });
    }
    const notificationItems = notificationsQuery.data?.items ?? [];
    const hasPartialNotificationError = notificationsQuery.data?.hasPartialError ?? false;
    const reducedNotificationCapability = notificationsQuery.data?.reducedCapability ?? !__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$gateway$2f$index$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["isMockMode"];
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "min-h-screen bg-background text-foreground",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "grid min-h-screen grid-cols-1 md:grid-cols-[auto_1fr]",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].aside, {
                        animate: {
                            width: collapsed ? 86 : 292
                        },
                        transition: {
                            duration: 0.2,
                            ease: [
                                0.2,
                                0,
                                0,
                                1
                            ]
                        },
                        className: "hidden border-r border-border/70 bg-shell-sidebar shadow-[inset_-1px_0_0_0_color-mix(in_srgb,var(--foreground)_6%,transparent)] backdrop-blur md:flex md:flex-col",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                className: "flex h-16 items-center justify-between px-3",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$utils$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["cn"])("flex items-center gap-2", collapsed && "justify-center"),
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "grid h-8 w-8 place-items-center rounded-lg border border-primary/40 bg-primary/15 text-primary",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                    className: "text-[11px] font-semibold tracking-[0.14em]",
                                                    children: "IOC"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                    lineNumber: 347,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                lineNumber: 346,
                                                columnNumber: 15
                                            }, this),
                                            !collapsed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-sm font-semibold tracking-tight",
                                                        children: "IoC Manager"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                        lineNumber: 351,
                                                        columnNumber: 19
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "text-[11px] text-muted-foreground",
                                                        children: "Operational IOC management"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                        lineNumber: 352,
                                                        columnNumber: 19
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                lineNumber: 350,
                                                columnNumber: 17
                                            }, this) : null
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                                        lineNumber: 345,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                        size: "icon-sm",
                                        variant: "ghost",
                                        onClick: ()=>setCollapsed((previous)=>!previous),
                                        "aria-label": "Toggle sidebar",
                                        children: collapsed ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$panel$2d$left$2d$open$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__PanelLeftOpen$3e$__["PanelLeftOpen"], {
                                            className: "h-4 w-4"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/app-shell.tsx",
                                            lineNumber: 362,
                                            columnNumber: 28
                                        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$panel$2d$left$2d$close$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__PanelLeftClose$3e$__["PanelLeftClose"], {
                                            className: "h-4 w-4"
                                        }, void 0, false, {
                                            fileName: "[project]/src/components/workbench/app-shell.tsx",
                                            lineNumber: 362,
                                            columnNumber: 68
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                                        lineNumber: 356,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                lineNumber: 344,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$separator$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Separator"], {}, void 0, false, {
                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                lineNumber: 365,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SidebarContent, {
                                collapsed: collapsed,
                                pathname: pathname,
                                pinned: pinned,
                                recent: recent,
                                onTogglePin: handleTogglePin
                            }, void 0, false, {
                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                lineNumber: 366,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                        lineNumber: 339,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                        className: "min-w-0",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("header", {
                                className: "sticky top-0 z-40 border-b border-border/70 bg-shell-header shadow-[0_1px_0_0_color-mix(in_srgb,var(--foreground)_6%,transparent)] backdrop-blur-xl",
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "flex min-h-16 items-center gap-2 px-3 py-2 sm:px-4 md:px-6",
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Sheet"], {
                                                open: mobileOpen,
                                                onOpenChange: setMobileOpen,
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SheetTrigger"], {
                                                        className: "inline-flex size-8 items-center justify-center rounded-lg border border-border bg-surface-1 text-foreground md:hidden",
                                                        "aria-label": "Open sidebar",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$menu$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Menu$3e$__["Menu"], {
                                                            className: "h-4 w-4"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                            lineNumber: 383,
                                                            columnNumber: 19
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                        lineNumber: 379,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SheetContent"], {
                                                        side: "left",
                                                        className: "w-[304px] border-border bg-shell-sidebar p-0",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "px-4 pb-3 pt-5",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "text-sm font-semibold",
                                                                        children: "IoC Manager"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                                        lineNumber: 387,
                                                                        columnNumber: 21
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "text-xs text-muted-foreground",
                                                                        children: "Operational navigation"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                                        lineNumber: 388,
                                                                        columnNumber: 21
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                                lineNumber: 386,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$separator$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Separator"], {}, void 0, false, {
                                                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                                lineNumber: 390,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(SidebarContent, {
                                                                collapsed: false,
                                                                pathname: pathname,
                                                                onNavigate: ()=>setMobileOpen(false),
                                                                pinned: pinned,
                                                                recent: recent,
                                                                onTogglePin: handleTogglePin
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                                lineNumber: 391,
                                                                columnNumber: 19
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                        lineNumber: 385,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                lineNumber: 378,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                className: "min-w-0 flex-1",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                        className: "flex items-center gap-2",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                className: "wb-kicker hidden rounded-full border border-border/60 bg-surface-2/80 px-2 py-1 sm:inline-flex",
                                                                children: resolvedRoute.module
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                                lineNumber: 404,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                className: "truncate text-sm font-semibold tracking-tight",
                                                                children: resolvedRoute.title
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                                lineNumber: 407,
                                                                columnNumber: 19
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                        lineNumber: 403,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                        className: "truncate text-xs text-muted-foreground",
                                                        children: resolvedRoute.subtitle
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                        lineNumber: 409,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                lineNumber: 402,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("button", {
                                                type: "button",
                                                "data-testid": "global-search-trigger",
                                                onClick: ()=>setCommandOpen(true),
                                                className: "hidden h-8 min-w-64 items-center gap-2 rounded-lg border border-border/70 bg-surface-2/70 px-2.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground lg:inline-flex",
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__["Search"], {
                                                        className: "h-3.5 w-3.5"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                        lineNumber: 418,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                        className: "flex-1",
                                                        children: "Global search across routes, queue, and alerts"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                        lineNumber: 419,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("kbd", {
                                                        className: "rounded border border-border/80 bg-surface-1/80 px-1.5 py-0.5 text-[10px]",
                                                        children: "Ctrl+K"
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                        lineNumber: 420,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                lineNumber: 412,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                size: "icon-sm",
                                                variant: "outline",
                                                className: "lg:hidden",
                                                onClick: ()=>setCommandOpen(true),
                                                "aria-label": "Open global search",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$search$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Search$3e$__["Search"], {
                                                    className: "h-4 w-4"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                    lineNumber: 430,
                                                    columnNumber: 17
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                lineNumber: 423,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Sheet"], {
                                                open: notificationOpen,
                                                onOpenChange: setNotificationOpen,
                                                children: [
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SheetTrigger"], {
                                                        className: "inline-flex size-8 items-center justify-center rounded-lg border border-border bg-surface-1 text-foreground transition-colors hover:border-primary/35",
                                                        "aria-label": "Open notifications",
                                                        "data-testid": "notifications-trigger",
                                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$bell$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Bell$3e$__["Bell"], {
                                                            className: "h-4 w-4"
                                                        }, void 0, false, {
                                                            fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                            lineNumber: 439,
                                                            columnNumber: 19
                                                        }, this)
                                                    }, void 0, false, {
                                                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                        lineNumber: 434,
                                                        columnNumber: 17
                                                    }, this),
                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$sheet$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["SheetContent"], {
                                                        side: "right",
                                                        className: "w-full max-w-md border-border bg-surface-1 p-0",
                                                        children: [
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                                className: "border-b border-border/70 px-4 py-3",
                                                                children: [
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "text-sm font-semibold tracking-tight",
                                                                        children: "Notification Center"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                                        lineNumber: 443,
                                                                        columnNumber: 21
                                                                    }, this),
                                                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                                                                        className: "text-xs text-muted-foreground",
                                                                        children: "Queue pressure and recent system activity"
                                                                    }, void 0, false, {
                                                                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                                        lineNumber: 444,
                                                                        columnNumber: 21
                                                                    }, this)
                                                                ]
                                                            }, void 0, true, {
                                                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                                lineNumber: 442,
                                                                columnNumber: 19
                                                            }, this),
                                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(ShellNotifications, {
                                                                items: notificationItems,
                                                                isLoading: notificationsQuery.isLoading,
                                                                hasPartialError: hasPartialNotificationError,
                                                                reducedCapability: reducedNotificationCapability
                                                            }, void 0, false, {
                                                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                                lineNumber: 446,
                                                                columnNumber: 19
                                                            }, this)
                                                        ]
                                                    }, void 0, true, {
                                                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                        lineNumber: 441,
                                                        columnNumber: 17
                                                    }, this)
                                                ]
                                            }, void 0, true, {
                                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                lineNumber: 433,
                                                columnNumber: 15
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$ui$2f$button$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["Button"], {
                                                size: "sm",
                                                variant: "outline",
                                                onClick: ()=>{
                                                    signOut();
                                                    router.replace("/auth");
                                                },
                                                children: "Sign out"
                                            }, void 0, false, {
                                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                lineNumber: 455,
                                                columnNumber: 15
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                                        lineNumber: 377,
                                        columnNumber: 13
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                        className: "border-t border-border/70 px-3 py-2 sm:px-4 md:px-6",
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                            className: "flex flex-wrap items-center justify-between gap-2",
                                            children: [
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("nav", {
                                                    className: "flex items-center gap-1 text-[11px] text-muted-foreground",
                                                    "data-testid": "shell-breadcrumbs",
                                                    children: resolvedRoute.breadcrumbs.map((item, index)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                            className: "inline-flex items-center gap-1",
                                                            children: [
                                                                index > 0 ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    children: "/"
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                                    lineNumber: 472,
                                                                    columnNumber: 36
                                                                }, this) : null,
                                                                item.href ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                                    href: item.href,
                                                                    className: "hover:text-foreground",
                                                                    children: item.label
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                                    lineNumber: 474,
                                                                    columnNumber: 25
                                                                }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                                                    children: item.label
                                                                }, void 0, false, {
                                                                    fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                                    lineNumber: 478,
                                                                    columnNumber: 25
                                                                }, this)
                                                            ]
                                                        }, `${item.label}:${index}`, true, {
                                                            fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                            lineNumber: 471,
                                                            columnNumber: 21
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                    lineNumber: 469,
                                                    columnNumber: 17
                                                }, this),
                                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                                                    className: "hidden flex-wrap items-center gap-1.5 lg:flex",
                                                    children: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$nav$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["QUEUE_FOCUS_ITEMS"].slice(0, 3).map((item)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$app$2d$dir$2f$link$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["default"], {
                                                            href: item.href,
                                                            className: "inline-flex h-7 items-center rounded-full border border-border/70 bg-surface-2/65 px-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground",
                                                            children: item.label
                                                        }, item.key, false, {
                                                            fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                            lineNumber: 486,
                                                            columnNumber: 21
                                                        }, this))
                                                }, void 0, false, {
                                                    fileName: "[project]/src/components/workbench/app-shell.tsx",
                                                    lineNumber: 484,
                                                    columnNumber: 17
                                                }, this)
                                            ]
                                        }, void 0, true, {
                                            fileName: "[project]/src/components/workbench/app-shell.tsx",
                                            lineNumber: 468,
                                            columnNumber: 15
                                        }, this)
                                    }, void 0, false, {
                                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                                        lineNumber: 467,
                                        columnNumber: 13
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                lineNumber: 376,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$components$2f$AnimatePresence$2f$index$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["AnimatePresence"], {
                                mode: "wait",
                                initial: false,
                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$framer$2d$motion$2f$dist$2f$es$2f$render$2f$components$2f$motion$2f$proxy$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["motion"].main, {
                                    variants: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$ui$2f$motion$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["pageMotion"],
                                    initial: "hidden",
                                    animate: "visible",
                                    exit: "exit",
                                    className: "wb-shell-main",
                                    children: children
                                }, pathname, false, {
                                    fileName: "[project]/src/components/workbench/app-shell.tsx",
                                    lineNumber: 500,
                                    columnNumber: 13
                                }, this)
                            }, void 0, false, {
                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                lineNumber: 499,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])("footer", {
                                className: "border-t border-border/70 px-3 py-3 text-[11px] text-muted-foreground sm:px-4 md:px-6",
                                children: [
                                    "Signed in as ",
                                    session?.username ?? "unknown",
                                    " | Roles: ",
                                    session?.roles.length ? (0, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$auth$2f$session$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["roleLabels"])(session.roles) : "none"
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/components/workbench/app-shell.tsx",
                                lineNumber: 512,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/components/workbench/app-shell.tsx",
                        lineNumber: 375,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/components/workbench/app-shell.tsx",
                lineNumber: 338,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$command$2d$palette$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["WorkbenchCommandPalette"], {
                open: commandOpen,
                onOpenChange: setCommandOpen
            }, void 0, false, {
                fileName: "[project]/src/components/workbench/app-shell.tsx",
                lineNumber: 518,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$workbench$2d$inspector$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["WorkbenchInspectorDrawer"], {}, void 0, false, {
                fileName: "[project]/src/components/workbench/app-shell.tsx",
                lineNumber: 519,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/components/workbench/app-shell.tsx",
        lineNumber: 337,
        columnNumber: 5
    }, this);
}
_s2(WorkbenchShell, "m3T3XbGdh2pKmK7iAO3L8HAnhQY=", false, function() {
    return [
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["usePathname"],
        __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$navigation$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useRouter"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$auth$2f$auth$2d$provider$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useAuth"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$components$2f$workbench$2f$workbench$2d$inspector$2e$tsx__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchInspector"],
        __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$shared$2f$query$2f$use$2d$workbench$2d$query$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useWorkbenchQuery"]
    ];
});
_c4 = WorkbenchShell;
var _c, _c1, _c2, _c3, _c4;
__turbopack_context__.k.register(_c, "SidebarNav");
__turbopack_context__.k.register(_c1, "SidebarWorkArea");
__turbopack_context__.k.register(_c2, "SidebarContent");
__turbopack_context__.k.register(_c3, "ShellNotifications");
__turbopack_context__.k.register(_c4, "WorkbenchShell");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);

//# sourceMappingURL=src_9ecbf7a1._.js.map