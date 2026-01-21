import {evaluate} from 'mathjs';

/**
* Calculator Tool for mathematical operations 
*/
export const calculatorTool = {
    name: 'Calculator',
    description: 'A tool to perform mathematical calculations. Input should be a valid mathematical expression.',
    parameters: {
        expression: {
            type: 'string',
            description: 'A valid mathematical expression to evaluate, e.g., "2 + 2 * (3 - 1)"',
            required: true,
        }
    },

    async execute(params){
        try{
            const {expression} = params;
            console.log(`Calculating expression: ${expression}`);
            //using math.js to evaluate the expression
            const result = evaluate(expression);

            return {
                success: true,
                result: result,
                message: `The result of the expression "${expression}" is ${result}.`,

            };

        } catch(error){
            return{
                success: false,
                error: error.message,
                message:`Invalid mathematical expression: ${error.message}`,
            }
        }
    }
}