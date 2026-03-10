import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Scan, Camera, History, X, AlertCircle } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (articleNumber: string) => void;
  onError?: (error: string) => void;
}

interface RecentScan {
  articleNumber: string;
  timestamp: Date;
}

/**
 * BarcodeScanner Component
 *
 * Provides camera/photo barcode scanning plus recent-scan recall.
 */
export function BarcodeScanner({
  onScan,
  onError,
}: BarcodeScannerProps) {
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);
  const [isLiveCameraSupported, setIsLiveCameraSupported] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showLiveScanner, setShowLiveScanner] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);
  const scannerContainerId = "barcode-scanner-container";
  const fileScannerContainerId = "barcode-file-scanner-container";

  // Load recent scans from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("recentScans");
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert timestamp strings back to Date objects
        const scans = parsed.map((scan: any) => ({
          ...scan,
          timestamp: new Date(scan.timestamp),
        }));
        setRecentScans(scans);
      }
    } catch (err) {
      console.error("Failed to load recent scans:", err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    setIsLiveCameraSupported(
      window.isSecureContext &&
      typeof navigator !== "undefined" &&
      typeof navigator.mediaDevices?.getUserMedia === "function"
    );
  }, []);

  // Save recent scans to localStorage
  const saveRecentScans = (scans: RecentScan[]) => {
    try {
      localStorage.setItem("recentScans", JSON.stringify(scans));
    } catch (err) {
      console.error("Failed to save recent scans:", err);
    }
  };

  const handleRecentScanClick = (articleNumber: string) => {
    onScan(articleNumber);
  };

  const clearRecentScans = () => {
    setRecentScans([]);
    localStorage.removeItem("recentScans");
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  /**
   * Opens the camera scanner modal and initializes the scanner
   */
  const handleOpenCamera = async () => {
    setPhotoError(null);

    // iPhone over LAN HTTP is not a secure context, so live camera is blocked.
    if (!isLiveCameraSupported) {
      openPhotoCapture();
      return;
    }

    setShowLiveScanner(true);
    setCameraError(null);
    setIsScanning(true);

    // Wait for the dialog to render
    setTimeout(() => {
      startCamera();
    }, 100);
  };

  /**
   * Initializes and starts the Html5Qrcode scanner
   */
  const startCamera = async () => {
    try {
      const scanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      await scanner.start(
        { facingMode: "environment" }, // Use back camera on mobile
        config,
        (decodedText) => {
          // Successfully scanned a code
          handleCameraSuccess(decodedText);
        },
        (errorMessage) => {
          // Scanning errors (e.g., no QR code in view) - these are normal, so we ignore them
          // Only log them in development
          if (import.meta.env.DEV) {
            console.debug("Scan error:", errorMessage);
          }
        }
      );

      setIsScanning(false);
    } catch (err) {
      console.error("Camera start error:", err);
      const errorMsg = err instanceof Error ? err.message : "Failed to start camera";

      // Provide user-friendly error messages
      let friendlyError = errorMsg;
      if (errorMsg.includes("NotAllowedError") || errorMsg.includes("Permission")) {
        friendlyError = "Camera permission denied. Please allow camera access in your browser settings.";
      } else if (errorMsg.includes("NotFoundError")) {
        friendlyError = "No camera found on this device.";
      } else if (errorMsg.includes("NotReadableError")) {
        friendlyError = "Camera is already in use by another application.";
      }

      setCameraError(friendlyError);
      setIsScanning(false);

      if (onError) {
        onError(friendlyError);
      }
    }
  };

  /**
   * Handles successful barcode scan from camera
   */
  const handleCameraSuccess = (decodedText: string) => {
    // Stop the scanner
    stopCamera();

    processScannedCode(decodedText.trim());
  };

  const processScannedCode = (articleNumber: string) => {
    const trimmedText = articleNumber.trim();
    if (!trimmedText) {
      return;
    }

    // Add to recent scans
    const newScan: RecentScan = {
      articleNumber: trimmedText,
      timestamp: new Date(),
    };

    const updatedScans = [newScan, ...recentScans.filter(s => s.articleNumber !== trimmedText)]
      .slice(0, 5);

    setRecentScans(updatedScans);
    saveRecentScans(updatedScans);

    // Trigger callback
    onScan(trimmedText);
  };

  const openPhotoCapture = () => {
    if (photoInputRef.current) {
      photoInputRef.current.value = "";
      photoInputRef.current.click();
    }
  };

  const handlePhotoSelected = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) {
      return;
    }

    setPhotoError(null);
    setIsProcessingPhoto(true);

    // Ensure live scanning is stopped before file scan starts.
    await stopCamera();

    let imageScanner: Html5Qrcode | null = null;
    try {
      imageScanner = new Html5Qrcode(fileScannerContainerId);
      const decodedText = await imageScanner.scanFile(selectedFile, false);
      processScannedCode(decodedText);
    } catch (err) {
      console.error("Photo scan error:", err);
      const errorMsg =
        err instanceof Error ? err.message : "Could not read barcode from photo.";
      const friendlyError =
        errorMsg.includes("No MultiFormat Readers")
          ? "No barcode found in the photo. Try a sharper image with better lighting."
          : "Could not scan that photo. Try another angle or enter the article number manually.";
      setPhotoError(friendlyError);
      if (onError) {
        onError(friendlyError);
      }
    } finally {
      try {
        imageScanner?.clear();
      } catch {
        // no-op
      }
      setIsProcessingPhoto(false);
      event.target.value = "";
    }
  };

  /**
   * Stops the camera scanner and cleans up
   */
  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        const scanner = scannerRef.current;
        if (scanner.isScanning) {
          await scanner.stop();
        }
        scannerRef.current = null;
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  /**
   * Handles closing the camera modal
   */
  const handleCloseCamera = () => {
    stopCamera();
    setShowLiveScanner(false);
    setCameraError(null);
    setIsScanning(false);
  };

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        stopCamera();
      }
    };
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Scan className="h-5 w-5" aria-hidden="true" />
          Scan Product
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhotoSelected}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
        <div id={fileScannerContainerId} className="hidden" />

        {/* Camera Scanner */}
        <Button
          variant="outline"
          className="w-full"
          onClick={handleOpenCamera}
          aria-label={
            isLiveCameraSupported
              ? "Open camera to scan barcode"
              : "Take photo to scan barcode"
          }
          disabled={isProcessingPhoto}
        >
          <Camera className="h-4 w-4 mr-2" aria-hidden="true" />
          {isLiveCameraSupported ? "Use Live Camera to Scan" : "Take Photo to Scan"}
        </Button>

        <Button
          variant="ghost"
          className="w-full"
          onClick={openPhotoCapture}
          disabled={isProcessingPhoto}
          aria-label="Upload a photo to scan barcode"
        >
          {isProcessingPhoto ? "Scanning photo..." : "Scan from Photo Library"}
        </Button>

        {!isLiveCameraSupported && (
          <p className="text-xs text-muted-foreground">
            Live camera requires HTTPS (or localhost). On iPhone over local network HTTP,
            use photo scan.
          </p>
        )}

        {photoError && (
          <p className="text-xs text-destructive" role="alert">
            {photoError}
          </p>
        )}

        {/* Inline Live Camera Scanner */}
        {isLiveCameraSupported && showLiveScanner && (
          <div className="space-y-4 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Live Camera Scan
              </h3>
              <Button variant="ghost" size="sm" onClick={handleCloseCamera}>
                <X className="h-4 w-4 mr-2" />
                Close
              </Button>
            </div>

            <div className="relative">
              <div
                id={scannerContainerId}
                className="rounded-lg overflow-hidden border-2 border-border"
                style={{ minHeight: "300px" }}
              />

              {isScanning && !cameraError && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                  <div className="text-center space-y-2">
                    <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
                    <p className="text-sm text-muted-foreground">Starting camera...</p>
                  </div>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <p className="text-sm text-destructive font-medium">Camera Error</p>
                </div>
                <p className="text-sm text-muted-foreground">{cameraError}</p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setCameraError(null);
                      setIsScanning(true);
                      startCamera();
                    }}
                  >
                    Try Again
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={openPhotoCapture}
                    disabled={isProcessingPhoto}
                  >
                    {isProcessingPhoto ? "Scanning photo..." : "Scan from Photo"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Recent Scans */}
        {recentScans.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <History className="h-4 w-4" aria-hidden="true" />
                Recent Scans
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearRecentScans}
                className="h-7 text-xs"
                aria-label="Clear recent scans"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>

            <div className="space-y-1.5">
              {recentScans.map((scan, index) => (
                <button
                  key={`${scan.articleNumber}-${index}`}
                  onClick={() => handleRecentScanClick(scan.articleNumber)}
                  className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors text-left group"
                  aria-label={`Scan ${scan.articleNumber} again`}
                >
                  <Badge variant="outline" className="font-mono text-xs">
                    {scan.articleNumber}
                  </Badge>
                  <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                    {formatTime(scan.timestamp)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
