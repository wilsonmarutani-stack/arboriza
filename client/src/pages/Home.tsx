import { useState } from "react";
import { Dashboard } from "@/components/Dashboard";
import { InspectionForm } from "@/components/InspectionForm";
import { InspectionsTable } from "@/components/InspectionsTable";
import { MapView } from "@/components/MapView";

type View = "dashboard" | "inspection-form" | "inspections" | "map" | "reports";

export default function Home() {
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [inspectionFormData, setInspectionFormData] = useState<{
    lat?: number;
    lng?: number;
  } | null>(null);

  const handleNewInspection = (coordinates?: { lat: number; lng: number }) => {
    setInspectionFormData(coordinates || null);
    setCurrentView("inspection-form");
  };

  const handleCloseInspectionForm = () => {
    setInspectionFormData(null);
    setCurrentView("dashboard");
  };

  const handleShowInspections = () => {
    setCurrentView("inspections");
  };

  const handleShowMap = () => {
    setCurrentView("map");
  };

  const handleShowReports = () => {
    setCurrentView("reports");
  };

  const renderContent = () => {
    switch (currentView) {
      case "dashboard":
        return (
          <Dashboard
            onNewInspection={handleNewInspection}
            onShowMap={handleShowMap}
            onShowReports={handleShowReports}
          />
        );
      case "inspection-form":
        return (
          <InspectionForm
            onClose={handleCloseInspectionForm}
            initialData={inspectionFormData}
          />
        );
      case "inspections":
        return (
          <InspectionsTable 
            onNewInspection={handleNewInspection}
            onEditInspection={(inspection) => {
              setInspectionFormData({ 
                lat: inspection.latitude, 
                lng: inspection.longitude 
              });
              setCurrentView("inspection-form");
            }}
          />
        );
      case "map":
        return (
          <MapView 
            onNewInspection={handleNewInspection}
            onEditInspection={(inspection) => {
              setInspectionFormData({ 
                lat: inspection.latitude, 
                lng: inspection.longitude 
              });
              setCurrentView("inspection-form");
            }}
          />
        );
      case "reports":
        return (
          <InspectionsTable 
            onNewInspection={handleNewInspection}
            onEditInspection={(inspection) => {
              setInspectionFormData({ 
                lat: inspection.latitude, 
                lng: inspection.longitude 
              });
              setCurrentView("inspection-form");
            }}
          />
        );
      default:
        return (
          <Dashboard
            onNewInspection={handleNewInspection}
            onShowMap={handleShowMap}
            onShowReports={handleShowReports}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                  <svg 
                    className="w-6 h-6 text-white" 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                    data-testid="logo-icon"
                  >
                    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H9a1 1 0 110 2H7.771l.062-.245L8.77 12zM11 12a1 1 0 110 2h-1.229l.062.245L10.771 15H11a1 1 0 110 2H9.229l.804.804A1 1 0 019.326 19H6.674a1 1 0 01-.707-1.196l.804-.804H5a3 3 0 01-3-3V5a3 3 0 013-3h10a3 3 0 013 3v8a3 3 0 01-3 3h-1.674a1 1 0 01-.707 1.196l.804.804A1 1 0 0112.326 19H9.674a1 1 0 01-.707-1.196L9.771 17H11z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Arborização Urbana</h1>
                  <p className="text-sm text-gray-500">Sistema de Gestão de Inspeções</p>
                </div>
              </div>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              <button 
                onClick={() => setCurrentView("dashboard")}
                className={`nav-link flex items-center space-x-2 pb-2 border-b-2 transition-colors ${
                  currentView === "dashboard" 
                    ? "text-primary-600 border-primary-600" 
                    : "text-gray-600 hover:text-primary-600 border-transparent"
                }`}
                data-testid="nav-dashboard"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                  <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                </svg>
                <span>Dashboard</span>
              </button>
              <button 
                onClick={() => setCurrentView("inspections")}
                className={`nav-link flex items-center space-x-2 pb-2 border-b-2 transition-colors ${
                  currentView === "inspections" 
                    ? "text-primary-600 border-primary-600" 
                    : "text-gray-600 hover:text-primary-600 border-transparent"
                }`}
                data-testid="nav-inspections"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                <span>Inspeções</span>
              </button>
              <button 
                onClick={() => setCurrentView("map")}
                className={`nav-link flex items-center space-x-2 pb-2 border-b-2 transition-colors ${
                  currentView === "map" 
                    ? "text-primary-600 border-primary-600" 
                    : "text-gray-600 hover:text-primary-600 border-transparent"
                }`}
                data-testid="nav-map"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span>Mapa</span>
              </button>
              <button 
                onClick={() => setCurrentView("reports")}
                className={`nav-link flex items-center space-x-2 pb-2 border-b-2 transition-colors ${
                  currentView === "reports" 
                    ? "text-primary-600 border-primary-600" 
                    : "text-gray-600 hover:text-primary-600 border-transparent"
                }`}
                data-testid="nav-reports"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z" clipRule="evenodd" />
                </svg>
                <span>Relatórios</span>
              </button>
            </nav>

            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 relative" data-testid="button-notifications">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                </svg>
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  3
                </span>
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700">João Silva</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <nav className="md:hidden bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-50">
        <div className="flex justify-around py-2">
          <button 
            onClick={() => setCurrentView("dashboard")}
            className={`nav-mobile-btn flex flex-col items-center py-2 px-1 transition-colors ${
              currentView === "dashboard" ? "text-primary-600" : "text-gray-400"
            }`}
            data-testid="mobile-nav-dashboard"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
              <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
            </svg>
            <span className="text-xs mt-1">Dashboard</span>
          </button>
          <button 
            onClick={() => setCurrentView("inspections")}
            className={`nav-mobile-btn flex flex-col items-center py-2 px-1 transition-colors ${
              currentView === "inspections" ? "text-primary-600" : "text-gray-400"
            }`}
            data-testid="mobile-nav-inspections"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            <span className="text-xs mt-1">Inspeções</span>
          </button>
          <button 
            onClick={() => setCurrentView("map")}
            className={`nav-mobile-btn flex flex-col items-center py-2 px-1 transition-colors ${
              currentView === "map" ? "text-primary-600" : "text-gray-400"
            }`}
            data-testid="mobile-nav-map"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <span className="text-xs mt-1">Mapa</span>
          </button>
          <button 
            onClick={() => setCurrentView("reports")}
            className={`nav-mobile-btn flex flex-col items-center py-2 px-1 transition-colors ${
              currentView === "reports" ? "text-primary-600" : "text-gray-400"
            }`}
            data-testid="mobile-nav-reports"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 0v12h8V4H6z" clipRule="evenodd" />
            </svg>
            <span className="text-xs mt-1">Relatórios</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 mb-20 md:mb-6">
        {renderContent()}
      </main>

      {/* Floating Action Button for Mobile */}
      {currentView !== "inspection-form" && (
        <button 
          className="fixed bottom-20 right-6 md:hidden w-14 h-14 bg-primary-500 hover:bg-primary-600 rounded-full shadow-lg flex items-center justify-center text-white transition-colors z-40"
          onClick={() => handleNewInspection()}
          data-testid="fab-nova-inspecao"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
        </button>
      )}
    </div>
  );
}
