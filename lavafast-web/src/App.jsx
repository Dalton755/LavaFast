import Dashboard from "./modules/dashboard/pages/Dashboard";
import { LojaProvider } from "./context/LojaContext";

export default function App() {

    return (

        <LojaProvider>

            <Dashboard />

        </LojaProvider>

    );

}