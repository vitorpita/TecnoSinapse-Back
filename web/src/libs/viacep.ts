import axios from 'axios';

export const buscarCep = async (cep: string) => {
  const cepLimpo = cep.replace(/\D/g, '');
  if (cepLimpo.length !== 8) return null;
  
  const { data } = await axios.get(`https://viacep.com.br/ws/${cepLimpo}/json/`);
  if (data.erro) throw new Error('CEP não encontrado');
  
  return data;
};