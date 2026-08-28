"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X, ArrowRight, Loader2, Info } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import {
    getPipelineReachedApplications,
    type PipelineReachedApplication,
} from "@/lib/api";
import type { DashboardData } from "./dashboard-data";

export function PipelineSection({
    maxPipelineCount,
    pipeline,
}: {
    maxPipelineCount: DashboardData["maxPipelineCount"];
    pipeline: DashboardData["pipeline"];
}) {
    const [modalStage, setModalStage] = useState<{
        key: string;
        label: string;
    } | null>(null);

    const openModal = useCallback((key: string, label: string) => {
        setModalStage({ key, label });
    }, []);

    const closeModal = useCallback(() => setModalStage(null), []);

    return (
        <>
            <section className="rounded-lg border border-neutral-200 bg-white">
                <div className="flex items-center gap-2 border-b border-neutral-100 px-5 py-4">
                    <h2 className="text-sm font-semibold text-neutral-700">Pipeline</h2>
                    <InfoTooltip
                        title="Current status and stages reached"
                        items={[
                            "The main number shows applications currently at that stage.",
                            "Reached includes applications that later moved on, were rejected, or became ghosted.",
                            "Click 'X reached' to see which applications reached that stage.",
                        ]}
                    />
                </div>
                <div className="grid grid-cols-1 gap-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-8">
                    {pipeline.map((stage) => (
                        <div key={stage.label} className="min-w-0">
                            <div className="mb-2 flex items-center justify-between gap-2">
                                <span className="truncate text-xs font-medium text-neutral-500">
                                    {stage.label}
                                </span>
                                <span className="text-xs font-semibold text-neutral-700">
                                    {stage.count}
                                </span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                                <div
                                    className={`h-full rounded-full ${stage.color}`}
                                    style={{
                                        width:
                                            stage.count === 0
                                                ? "0%"
                                                : `${Math.max(8, Math.round((stage.count / maxPipelineCount) * 100))}%`,
                                    }}
                                />
                            </div>
                            {stage.showReached && stage.reached > 0 ? (
                                <button
                                    type="button"
                                    onClick={() => openModal(stage.key, stage.label)}
                                    className="mt-1.5 text-[11px] text-neutral-400 underline decoration-dotted underline-offset-2 transition-colors hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
                                >
                                    {stage.reached} reached
                                </button>
                            ) : stage.showReached ? (
                                <p className="mt-1.5 text-[11px] text-neutral-400">
                                    {stage.reached} reached
                                </p>
                            ) : null}
                        </div>
                    ))}
                </div>
            </section>

            {modalStage && (
                <ReachedModal
                    stageKey={modalStage.key}
                    stageLabel={modalStage.label}
                    onClose={closeModal}
                />
            )}
        </>
    );
}

function ReachedModal({
    stageKey,
    stageLabel,
    onClose,
}: {
    stageKey: string;
    stageLabel: string;
    onClose: () => void;
}) {
    const [applications, setApplications] = useState<
        PipelineReachedApplication[] | null
    >(null);
    const [error, setError] = useState<string | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let cancelled = false;
        getPipelineReachedApplications(stageKey)
            .then((data) => {
                if (!cancelled) setApplications(data);
            })
            .catch(() => {
                if (!cancelled) setError("Failed to load applications.");
            });
        return () => {
            cancelled = true;
        };
    }, [stageKey]);

    // Lock scroll while modal is open (lock both html and body for reliability)
    useEffect(() => {
        const prevBody = document.body.style.overflow;
        const prevHtml = document.documentElement.style.overflow;
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prevBody;
            document.documentElement.style.overflow = prevHtml;
        };
    }, []);

    // Close on Escape
    useEffect(() => {
        function onKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") onClose();
        }
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    // Trap focus to panel on open
    useEffect(() => {
        panelRef.current?.focus();
    }, []);

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reached-modal-title"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Panel */}
            <div
                ref={panelRef}
                tabIndex={-1}
                className="relative z-10 w-full max-w-lg rounded-t-2xl bg-white shadow-2xl focus:outline-none sm:rounded-2xl"
                style={{ maxHeight: "80vh" }}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
                    <div>
                        <h2
                            id="reached-modal-title"
                            className="text-sm font-semibold text-neutral-800"
                        >
                            {stageLabel} — Applications that reached this stage
                        </h2>
                        {applications !== null && (
                            <p className="mt-0.5 text-xs text-neutral-400">
                                {applications.length} application
                                {applications.length !== 1 ? "s" : ""}
                            </p>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto" style={{ maxHeight: "calc(80vh - 65px)" }}>
                    {error !== null ? (
                        <p className="px-5 py-8 text-center text-sm text-red-500">
                            {error}
                        </p>
                    ) : applications === null ? (
                        <div className="flex items-center justify-center px-5 py-12">
                            <Loader2 className="h-5 w-5 animate-spin text-neutral-400" />
                        </div>
                    ) : applications.length === 0 ? (
                        <p className="px-5 py-8 text-center text-sm text-neutral-400">
                            No applications found for this stage.
                        </p>
                    ) : (
                        <ul className="divide-y divide-neutral-100">
                            {applications.map((app) => (
                                <li key={app.id}>
                                    <Link
                                        href={`/applications/${app.id}`}
                                        onClick={onClose}
                                        className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-neutral-50"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium text-neutral-800">
                                                {app.title}
                                            </p>
                                            <p className="mt-0.5 truncate text-xs text-neutral-400">
                                                {app.company_name}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <StatusBadge status={app.status} />
                                            <ArrowRight className="h-3.5 w-3.5 text-neutral-300" />
                                        </div>
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

function InfoTooltip({
    title,
    items,
}: {
    title: string;
    items: string[];
}) {
    return (
        <div className="group relative">
            <button
                type="button"
                aria-label={title}
                className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-neutral-600 focus-visible:bg-neutral-100 focus-visible:text-neutral-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
            >
                <Info className="h-4 w-4" />
            </button>
            <div
                role="tooltip"
                className="pointer-events-none absolute left-0 top-8 z-20 w-64 rounded-md border border-neutral-200 bg-white p-3 text-xs text-neutral-600 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 sm:left-1/2 sm:w-72 sm:-translate-x-1/2"
            >
                <p className="mb-2 font-semibold text-neutral-700">{title}</p>
                <ul className="space-y-1">
                    {items.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
