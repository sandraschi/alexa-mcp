import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, RefreshCw } from "lucide-react";

export function Settings() {
    const [provider, setProvider] = useState("ollama");
    const [model, setModel] = useState("gemini-2.0-flash-exp");
    const [endpoint, setEndpoint] = useState("http://localhost:11434");

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Settings</h2>
                <p className="text-slate-400">Configure Local LLM and app preferences</p>
            </div>

            <div className="grid gap-6">
                <Card className="border-slate-800 bg-slate-950/50">
                    <CardHeader>
                        <CardTitle className="text-white">Local LLM Configuration</CardTitle>
                        <CardDescription className="text-slate-400">Select your preferred AI provider and model</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-2">
                            <Label className="text-slate-300">Provider</Label>
                            <Select value={provider} onValueChange={setProvider}>
                                <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-100">
                                    <SelectValue placeholder="Select provider" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                    <SelectItem value="ollama">Ollama</SelectItem>
                                    <SelectItem value="lmstudio">LM Studio</SelectItem>
                                    <SelectItem value="openai_compatible">OpenAI Compatible</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label className="text-slate-300">Endpoint URL</Label>
                            <Input
                                className="bg-slate-900 border-slate-800 text-slate-100 placeholder:text-slate-400"
                                value={endpoint}
                                onChange={(e) => setEndpoint(e.target.value)}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label className="text-slate-300">Model Selection</Label>
                            <Select value={model} onValueChange={setModel}>
                                <SelectTrigger className="bg-slate-900 border-slate-800 text-slate-100">
                                    <SelectValue placeholder="Select model" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-slate-800 text-slate-100">
                                    <SelectItem value="gemini-2.0-flash-exp">Gemini 2.0 Flash</SelectItem>
                                    <SelectItem value="llama3.1:8b">Llama 3.1 8B</SelectItem>
                                    <SelectItem value="mistral:latest">Mistral</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button className="bg-blue-600 hover:bg-blue-700">
                                <Save className="mr-2 h-4 w-4" /> Save Settings
                            </Button>
                            <Button variant="outline" className="border-slate-800 text-slate-300 hover:bg-slate-800">
                                <RefreshCw className="mr-2 h-4 w-4" /> Refresh Models
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-950/50">
                    <CardHeader>
                        <CardTitle className="text-white">App Information</CardTitle>
                        <CardDescription className="text-slate-400">SOTA Version 12.1 - Alsergrund Standard</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Server Status</span>
                            <span className="text-green-500 font-medium">Online</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Transport</span>
                            <span className="text-blue-400 font-medium">HTTP/Dual</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-400">Port</span>
                            <span className="text-slate-200">10801</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
