import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Landing        from "./pages/Landing"
import Register       from "./pages/Register"
import Login          from "./pages/Login"
import Dashboard      from "./pages/Dashboard"
import ForgotPassword from "./pages/ForgotPassword"
import ResetPassword  from "./pages/ResetPassword"
import Photobooth     from "./pages/Photobooth"
import Frames         from "./pages/Frames"
import ProtectedRoute from "./components/ProtectedRoute"
import GestureGif from "./pages/GestureGif"

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"                element={<Landing />} />
        <Route path="/login"           element={<Login />} />
        <Route path="/register"        element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />
        <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/photobooth" element={<ProtectedRoute><Photobooth /></ProtectedRoute>} />
        <Route path="/frames"     element={<ProtectedRoute><Frames /></ProtectedRoute>} />
        <Route path="/gesture-gif" element={<ProtectedRoute><GestureGif /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  )
}
