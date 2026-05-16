import axios from 'axios';

export const buscarCnpj = async (cnpj: string) => {
  const cnpjLimpo = cnpj.replace(/\D/g, '');
  if (cnpjLimpo.length !== 14) return null;
  
  const { data } = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
  return data;
};