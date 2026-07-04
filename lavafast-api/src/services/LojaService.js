import supabase from '../config/supabase.js';

class LojaService {

    async listar() {

        const { data, error } = await supabase
            .schema('operacoes')
            .from('lojas')
            .select('*')
            .order('nome');

        if (error) {

            throw error;

        }

        return data;

    }

}

export default new LojaService();