import * as React from "react"
import { toast as sonnerToast } from "sonner"

type ToastProps = {
    title?: string
    description?: string
    action?: React.ReactNode
    variant?: "default" | "destructive"
}

type ToastActionElement = React.ReactElement

const useToast = () => {
    const toast = React.useCallback(({ title, description, action, variant = "default" }: ToastProps) => {
        sonnerToast(title || description || "Notification", {
            description: title ? description : undefined,
            action: action as ToastActionElement,
            style: variant === "destructive" ? {
                backgroundColor: "#dc2626",
                color: "white"
            } : undefined,
        })
    }, [])

    return { toast }
}

export { useToast }
export type { ToastProps }