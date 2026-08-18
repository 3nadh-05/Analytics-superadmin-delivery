import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { Shell } from "./features/delivery-management/components/Shell";
import { DeliveryStatisticsPage } from "./features/delivery-management/pages/DeliveryStatisticsPage";
import { ComparisonPage } from "./features/delivery-management/pages/ComparisonPage";
import { DataEntryPage } from "./features/delivery-management/pages/DataEntryPage";
import { RidersPage } from "./features/delivery-management/pages/RidersPage";
import { MerchantsPage } from "./features/delivery-management/pages/MerchantsPage";
import { PayoutsPage } from "./features/delivery-management/pages/PayoutsPage";

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/delivery/statistics" replace />} />
        <Route path="/delivery" element={<Shell />}>
          <Route index element={<Navigate to="statistics" replace />} />
          <Route path="statistics" element={<DeliveryStatisticsPage />} />
          <Route path="comparison" element={<ComparisonPage />} />
          <Route path="entry" element={<DataEntryPage />} />
          <Route path="riders" element={<RidersPage />} />
          <Route path="merchants" element={<MerchantsPage />} />
          <Route path="payouts" element={<PayoutsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/delivery/statistics" replace />} />
      </Routes>
    </HashRouter>
  );
}
