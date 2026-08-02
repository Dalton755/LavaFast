import Dashboard from "./modules/dashboard/pages/Dashboard";
import SimplifiedOperation from "./pages/operation/SimplifiedOperation";
import { LojaProvider } from "./context/LojaContext";

export default function App() {

    return (

        <LojaProvider>

            {/* Dashboard antigo */}
            {/* <Dashboard /> */}

            {/* Nova operação simplificada */}
            <SimplifiedOperation />

        </LojaProvider>

    );

}