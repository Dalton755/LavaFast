import Header from "../components/layout/Header";

export default function MainLayout({ children }) {
    return (
        <div className="lf-app">
            <Header />
            <main id="conteudo-principal" className="lf-main">
                {children}
            </main>
        </div>
    );
}
