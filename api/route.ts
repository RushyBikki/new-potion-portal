export const cauldronData = async () => {
    const response = await fetch(`${process.env.BASE_URL}/api/Information/cauldrons?api_key=${process.env.API_KEY}`);;
    const data = await response.json()
    return data.results;
}
