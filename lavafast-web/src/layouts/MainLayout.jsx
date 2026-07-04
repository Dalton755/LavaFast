import Header from '../components/layout/Header';

export default function MainLayout({ children }) {

    return (

        <div className="min-h-screen bg-slate-100">

            <Header />

            <main className="max-w-7xl mx-auto px-6 py-6">

                {children}

            </main>

        </div>

    );

}