import axios from 'axios';
export const cauldronData = async (query : string) => {
    try{
    const response = await axios.get(`/api${query}`);
    return response.data;
    }catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}
//?api_key=${process.env.API_KEY}
/*import axios from 'axios';
export const cauldronData = async (query : string) => {
    console.log(process.env.NEXT_PUBLIC_BASE_URL);
    try{
    const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL}/api${query}`);
    console.log(response.data.results);
    return response.data.results;}
    catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}*/