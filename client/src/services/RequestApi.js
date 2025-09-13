export default async function RequestApi(endpoint, method, data, user) {
    const baseUrl = `https://server-98434363848.us-central1.run.app/api/${endpoint}`;
    
    const headers = {
        authorization: `Bearer ${user.token}`,
        deviceId: "15076528654"
    };

    const options = {
        method: method.toUpperCase(),
        headers
    };

    const hasBody = ["POST", "PUT", "PATCH"].includes(options.method);

    let url = baseUrl;

    if (hasBody) {
        headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(data);
    } else if (data && Object.keys(data).length > 0) {
        const queryParams = new URLSearchParams(data).toString();
        url += `?${queryParams}`;
    }

    try {
        const response = await fetch(url, options);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error("Erro na requisição:", error.message);
        throw error;
    }
}
