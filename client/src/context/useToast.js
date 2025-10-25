import { useContext } from "react";
import ToastContext from "./ToastContext";

export default function useToast() {
  return useContext(ToastContext);
}
