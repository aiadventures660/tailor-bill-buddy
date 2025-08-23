import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  const getIcon = (variant: string) => {
    switch (variant) {
      case "success":
        return <CheckCircle className="h-6 w-6 text-green-600" />
      case "destructive":
        return <AlertCircle className="h-6 w-6 text-red-600" />
      case "warning":
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />
      default:
        return <Info className="h-6 w-6 text-blue-600" />
    }
  }

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 mt-0.5">
                {getIcon(variant || "default")}
              </div>
              <div className="flex-1 grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
