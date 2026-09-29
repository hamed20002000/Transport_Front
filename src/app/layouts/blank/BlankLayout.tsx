import { Outlet } from "react-router-dom";
import AiLauncher from "src/features/ai-agent/components/AiLauncher";

const BlankLayout = () => (
  <>
    <Outlet />
    <AiLauncher />
  </>
);

export default BlankLayout;
