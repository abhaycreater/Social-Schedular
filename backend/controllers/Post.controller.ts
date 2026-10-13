
import { Response } from "express";
import { authRequest } from "../middleware/auth.middleware.js";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
import { cloudinary } from "../config/cloudinary.js";
import { Generation } from "../models/Generations.js";
import { Post } from "../models/Post.js";

// Supported social platforms
type Platform =
    | "twitter"
    | "linkedin"
    | "facebook"
    | "instagram"
    | "facebook_page"
    | "linkedin_page"
    | "instagram_page";

const VALID_PLATFORMS: Platform[] = [
    "twitter",
    "linkedin",
    "facebook",
    "instagram",
    "facebook_page",
    "linkedin_page",
    "instagram_page",
];

const isPlatform = (value: string): value is Platform =>
    VALID_PLATFORMS.includes(value as Platform);

// Poll Leonardo AI until generation completes
const pollLeonardoJob = async (
    generationId: string,
    apiKey: string
): Promise<string> => {
    const maxRetries = 20;
    const delay = 5000;

    for (let i = 0; i < maxRetries; i++) {
        const response = await axios.get(
            `https://cloud.leonardo.ai/api/rest/v1/generations/${generationId}`,
            {
                headers: {
                    accept: "application/json",
                    authorization: `Bearer ${apiKey}`,
                },
            }
        );

        const generation = response.data?.generations_by_pk;

        if (generation?.status === "COMPLETE") {
            const images = generation.generated_images;

            if (Array.isArray(images) && images[0]?.url) {
                return images[0].url;
            }

            throw new Error("Generation completed, but no image was returned.");
        }

        if (generation?.status === "FAILED") {
            throw new Error("Leonardo AI image generation failed.");
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
    }

    throw new Error("Leonardo AI image generation timed out.");
};

// Generate a social media post
// POST /api/posts/generate
export const generatePost = async (
    req: authRequest,
    res: Response
): Promise<void> => {
    try {
        const { prompt, tone, generateImage } = req.body;

        if (typeof prompt !== "string" || !prompt.trim()) {
            res.status(400).json({ message: "Please provide a prompt." });
            return;
        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            res.status(500).json({
                message: "Gemini API key is missing from the backend environment.",
            });
            return;
        }

        const ai = new GoogleGenAI({ apiKey });

        const textResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate a social media post based on this prompt: ${prompt}.
Tone: ${tone || "friendly"}.
Include relevant hashtags.
Return JSON with "content" and "imagePrompt" fields.
The imagePrompt should describe an image that complements the post.`,
        });

        const rawText = textResponse.text || "";
        let content = rawText;
        let imagePrompt = prompt;

        try {
            const cleanedText = rawText
                .replace(/^```(?:json)?\s*/i, "")
                .replace(/\s*```$/, "");

            const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]);
                content = data.content || rawText;
                imagePrompt = data.imagePrompt || prompt;
            }
        } catch (error) {
            console.error("Gemini JSON parsing error:", error);
        }

        let mediaUrl = "";

        if (generateImage) {
            const leonardoKey = process.env.LEONARDO_API_KEY;

            if (leonardoKey) {
                try {
                    const leoResponse = await axios.post(
                        "https://cloud.leonardo.ai/api/rest/v2/generations",
                        {
                            public: false,
                            model: "gpt-image-2",
                            parameters: {
                                quality: "LOW",
                                prompt: imagePrompt,
                                quantity: 1,
                                width: 1024,
                                height: 1024,
                                prompt_enhance: "OFF",
                            },
                        },
                        {
                            headers: {
                                accept: "application/json",
                                authorization: `Bearer ${leonardoKey}`,
                                "content-type": "application/json",
                            },
                        }
                    );

                    const generationId =
                        leoResponse.data?.generate?.generationId;

                    if (!generationId) {
                        throw new Error(
                            "Leonardo AI did not return a generation ID."
                        );
                    }

                    const tempUrl = await pollLeonardoJob(
                        generationId,
                        leonardoKey
                    );

                    const uploadResult = await cloudinary.uploader.upload(
                        tempUrl,
                        { folder: "ai-generations" }
                    );

                    mediaUrl = uploadResult.secure_url;
                } catch (error: any) {
                    console.error(
                        "Image generation failed:",
                        error?.response?.data || error?.message
                    );
                }
            } else {
                console.warn(
                    "LEONARDO_API_KEY is missing; generating text only."
                );
            }
        }

        const generation = await Generation.create({
            user: req.user._id,
            prompt,
            content,
            mediaUrl,
            mediaType: mediaUrl ? "image" : undefined,
            tone,
        });

        res.status(201).json(generation);
    } catch (error: any) {
        console.error("Generate post error:", error?.response?.data || error?.message);

        res.status(500).json({
            message: error?.message || "Server error",
        });
    }
};

// Get generation history
// GET /api/posts/generation
export const getGeneration = async (
    req: authRequest,
    res: Response
): Promise<void> => {
    try {
        const generations = await Generation.find({
            user: req.user._id,
        }).sort({ createdAt: -1 });

        res.json(generations);
    } catch (error: any) {
        res.status(500).json({
            message: error?.message || "Server error",
        });
    }
};

// Get scheduled and published posts
// GET /api/posts
export const getPosts = async (
    req: authRequest,
    res: Response
): Promise<void> => {
    try {
        const posts = await Post.find({
            user: req.user._id,
        }).sort({ createdAt: -1 });

        res.json(posts);
    } catch (error: any) {
        res.status(500).json({
            message: error?.message || "Server error",
        });
    }
};

// Schedule a post
// POST /api/posts
export const schedulePost = async (
    req: authRequest,
    res: Response
): Promise<void> => {
    try {
        const { content, platforms, scheduledFor, status } = req.body;

        // Parse platforms sent by FormData
        let rawPlatforms: unknown = platforms;

        if (typeof rawPlatforms === "string") {
            const platformText = rawPlatforms;
            try {
                rawPlatforms = JSON.parse(platformText);
            } catch {
                rawPlatforms = platformText.split(",");
            }
        }

        if (!Array.isArray(rawPlatforms)) {
            res.status(400).json({
                message: "Platforms must be provided as an array.",
            });
            return;
        }

        const platformStrings: string[] = rawPlatforms
            .filter(
                (value: unknown): value is string =>
                    typeof value === "string"
            )
            .map((value: string) => value.trim())
            .filter(Boolean);

        const invalidPlatforms = platformStrings.filter(
            (value) => !isPlatform(value)
        );

        if (invalidPlatforms.length > 0) {
            res.status(400).json({
                message: `Invalid platforms: ${invalidPlatforms.join(", ")}`,
            });
            return;
        }

        // TypeScript now knows these are valid platform values
        const parsedPlatforms: Platform[] = platformStrings.filter(isPlatform);

        if (parsedPlatforms.length === 0) {
            res.status(400).json({
                message: "Please select at least one social platform.",
            });
            return;
        }

        if (typeof content !== "string" || !content.trim()) {
            res.status(400).json({
                message: "Post content is required.",
            });
            return;
        }

        if (
            typeof scheduledFor !== "string" ||
            Number.isNaN(Date.parse(scheduledFor))
        ) {
            res.status(400).json({
                message: "Please provide a valid scheduled date and time.",
            });
            return;
        }

        const scheduledDate = new Date(scheduledFor);

        if (scheduledDate.getTime() <= Date.now()) {
            res.status(400).json({
                message: "Please choose a future date and time.",
            });
            return;
        }

        // Handle optional media upload
        let mediaUrl: string | undefined = req.body.mediaUrl;
        let mediaType: "image" | "video" | undefined = req.body.mediaType;

        if (req.file) {
            const result = await new Promise<any>((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    {
                        resource_type: "auto",
                        folder: "social-schedular",
                    },
                    (error, uploadResult) => {
                        if (error) {
                            reject(error);
                        } else if (uploadResult) {
                            resolve(uploadResult);
                        } else {
                            reject(
                                new Error(
                                    "Cloudinary returned no upload result."
                                )
                            );
                        }
                    }
                );

                stream.end(req.file!.buffer);
            });

            mediaUrl = result.secure_url;
            mediaType =
                result.resource_type === "video" ? "video" : "image";
        }

        const post = await Post.create({
            user: req.user._id,
            content: content.trim(),
            platforms: parsedPlatforms,
            mediaUrl,
            mediaType,
            scheduledFor: scheduledDate,
            status: status === "draft" ? "draft" : "scheduled",
        });

        res.status(201).json({
            message: "Post scheduled successfully.",
            post,
        });
    } catch (error: any) {
        console.error(
            "Schedule post error:",
            error?.response?.data || error?.message
        );

        res.status(500).json({
            message: error?.message || "Server error",
        });
    }
};
