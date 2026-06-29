require("dotenv").config();

const express = require("express");
const cors = require("cors");
const acorn = require("acorn");
const walk = require("acorn-walk");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend/dist")));
app.get("/favicon.ico", (req, res) => res.status(204).end());

app.post("/explain", async (req, res) => {
    const { code, language } = req.body;

    let functions = 0;
    let loops = 0;
    const functionsList = [];
    const loopsList = [];

    try {
        // AST Parsing (JavaScript only)
        if (language === "JavaScript") {
            try {
                const ast = acorn.parse(code, {
                    ecmaVersion: "latest"
                });

                walk.simple(ast, {
                    FunctionDeclaration(node) {
                        functions++;
                        if (node.id && node.id.name) {
                            functionsList.push(node.id.name);
                        } else {
                            functionsList.push("(Anonymous function)");
                        }
                    },
                    ForStatement(node) {
                        loops++;
                        const line = code.substring(0, node.start).split('\n').length;
                        loopsList.push(`for loop at line ${line}`);
                    },
                    WhileStatement(node) {
                        loops++;
                        const line = code.substring(0, node.start).split('\n').length;
                        loopsList.push(`while loop at line ${line}`);
                    },
                    DoWhileStatement(node) {
                        loops++;
                        const line = code.substring(0, node.start).split('\n').length;
                        loopsList.push(`do-while loop at line ${line}`);
                    }
                });
            } catch (astErr) {
                console.warn("AST static analysis bypassed due to syntax error:", astErr.message);
            }
        }

        const prompt = `
You are an expert AI code analyst, explainer, and optimizer. You must perform input validation (Guardrails):
- **inScope**: Evaluate whether the input represents valid programming source code (e.g. JavaScript, Python, C++, etc.). Set to true if it is code. Set to false if it is a general knowledge question, recipe request, chat, conversational phrase, or plain text out of programming code scope.
- **outOfScopeMessage**: If inScope is false, generate a polite message explaining that the tool only explains programming code snippets, e.g. "Out of scope. Please provide a JavaScript or Python code snippet to analyze." If inScope is true, set this to an empty string "".

If inScope is true, include:
- **explanation**: Detailed step-by-step description of the input logic.
- **timeComplexity**: Worst-case execution complexity (e.g. O(n)).
- **spaceComplexity**: Total execution space footprint (e.g. O(1)).
- **optimizedCode**: Optimized rewrite of the provided source code, written in the same language. Ensure corner cases are handled.

AST Summary (for JavaScript only):
Functions: ${functions} (${functionsList.join(", ")})
Loops: ${loops} (${loopsList.join(", ")})

Explain the following ${language} code.
Code:
${code}
`;

        // Construct request payload
        const reqBody = {
            contents: [
                {
                    role: "user",
                    parts: [{ text: prompt }]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "OBJECT",
                    properties: {
                        inScope: {
                            type: "BOOLEAN",
                            description: "True if the input is valid programming code. False if it is out of scope (general questions, recipes, chat, non-code text)."
                        },
                        outOfScopeMessage: {
                            type: "STRING",
                            description: "Polite rejection message if inScope is false. Else empty string."
                        },
                        explanation: {
                            type: "STRING",
                            description: "A detailed explanation of how the code works and what it does. Empty if out of scope."
                        },
                        timeComplexity: {
                            type: "STRING",
                            description: "The time complexity of the original code, e.g., O(n) or O(1). Empty if out of scope."
                        },
                        spaceComplexity: {
                            type: "STRING",
                            description: "The space complexity of the original code, e.g., O(n) or O(1). Empty if out of scope."
                        },
                        optimizedCode: {
                            type: "STRING",
                            description: "The optimized or improved version of the code, written in the same language. Empty if out of scope."
                        }
                    },
                    required: ["inScope", "outOfScopeMessage", "explanation", "timeComplexity", "spaceComplexity", "optimizedCode"]
                }
            }
        };

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(reqBody)
            }
        );

        const data = await response.json();

        if (!response.ok) {
            const errMsg = data.error?.message || `Gemini API error (Status ${response.status})`;
            throw new Error(errMsg);
        }

        const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
        let parsedData = {};
        try {
            parsedData = JSON.parse(responseText);
        } catch (e) {
            console.error("JSON parsing error on Gemini response:", e);
        }

        // Guardrail: reject out-of-scope queries
        if (parsedData.hasOwnProperty("inScope") && parsedData.inScope === false) {
            return res.status(400).json({
                error: parsedData.outOfScopeMessage || "The input provided is out of scope. Please paste JavaScript or Python code snippet."
            });
        }

        res.json({
            explanation: parsedData.explanation || "",
            optimized: parsedData.optimizedCode || "",
            time: parsedData.timeComplexity || "N/A",
            space: parsedData.spaceComplexity || "N/A",
            astAnalysis: language === "JavaScript" ? {
                functionsCount: functions,
                loopsCount: loops,
                functionsList,
                loopsList
            } : null
        });

    } catch (err) {
        res.status(500).json({
            error: err.message
        });
    }
});

app.listen(3001, () => {
    console.log("Server running on http://localhost:3001");
});