import { cosineSimilarity } from "./similarity.js";

class VectorStore{
    constructor(){
        this.data = []; // {id, text, embedding}
    }

    add(id, text, embedding){
        this.data.push({id,text,embedding});
    }

    search(queryEmbedding, topK=3){
        const scored = this.data.map(item => ({
            ...item,
            score: cosineSimilarity(queryEmbedding, item.embedding)
        }));

        return scored
        .sort((a,b) => b.score - a.score)
        .slice(0, topK);
    }
}

export const vectorStore = new VectorStore();