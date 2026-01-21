import { describe, it, expect, beforeAll, afterEach } from "@jest/globals";
import { Recipe, type NewRecipeOptions } from "../../models/Recipe.js";
import { pool } from "../../db/db.js";
import { randomUUID } from "crypto";

describe("Recipe Model", () => {
    const getRecipeFromDb = async (recipe_id: string) => {
        const result = await pool.query('SELECT * FROM "recipes" WHERE "recipe_id" = $1', [recipe_id]);
        return result.rows[0] || null;
    };

    const cleanupTestRecipe = async (recipe_id: string) => {
        await pool.query('DELETE FROM "recipes" WHERE "recipe_id" = $1', [recipe_id]);
    };

    const cleanupTestRecipesByName = async (pattern: string) => {
        await pool.query('DELETE FROM "recipes" WHERE "name" LIKE $1', [pattern]);
    };

    beforeAll(async () => {
        await cleanupTestRecipesByName("Test%");
    }, 30000);

    afterEach(async () => {
        await cleanupTestRecipesByName("Test%");
    }, 30000);

    describe("Recipe.new()", () => {
        it("should create a new recipe with correct properties", async () => {
            const recipeOptions: NewRecipeOptions = {
                name: "Test Pasta",
                description: "A delicious pasta dish",
                prep_time: 30,
                number_of_servings: 4
            };

            const recipe = Recipe.new(recipeOptions);

            expect(recipe.name).toBe("Test Pasta");
            expect(recipe.description).toBe("A delicious pasta dish");
            expect(recipe.prep_time).toBe(30);
            expect(recipe.number_of_servings).toBe(4);
            expect(recipe.recipe_id).toBeDefined();
        }, 30000);

        it("should generate unique recipe_ids for different recipes", () => {
            const recipe1 = Recipe.new({
                name: "Test Recipe 1",
                description: "First recipe",
                prep_time: 15,
                number_of_servings: 2
            });

            const recipe2 = Recipe.new({
                name: "Test Recipe 2",
                description: "Second recipe",
                prep_time: 20,
                number_of_servings: 4
            });

            expect(recipe1.recipe_id).not.toBe(recipe2.recipe_id);
        }, 30000);

        it("should handle different prep times and servings", () => {
            const recipe = Recipe.new({
                name: "Test Quick Recipe",
                description: "Quick meal",
                prep_time: 5,
                number_of_servings: 1
            });

            expect(recipe.prep_time).toBe(5);
            expect(recipe.number_of_servings).toBe(1);
        }, 30000);
    });

    describe("Recipe.save()", () => {
        it("should insert new recipe into database", async () => {
            const recipe = Recipe.new({
                name: "Test Inserted Recipe",
                description: "Recipe to be inserted",
                prep_time: 25,
                number_of_servings: 3
            });

            await recipe.save();

            const dbRecipe = await getRecipeFromDb(recipe.recipe_id);
            expect(dbRecipe).toBeDefined();
            expect(dbRecipe.name).toBe("Test Inserted Recipe");
            expect(dbRecipe.description).toBe("Recipe to be inserted");
            expect(dbRecipe.prep_time).toBe(25);
            expect(dbRecipe.number_of_servings).toBe(3);
            expect(dbRecipe.recipe_id).toBe(recipe.recipe_id);

            await cleanupTestRecipe(recipe.recipe_id);
        }, 30000);

        it("should update existing recipe in database", async () => {
            const recipe = Recipe.new({
                name: "Test Original Name",
                description: "Original description",
                prep_time: 20,
                number_of_servings: 2
            });

            await recipe.save();

            recipe.name = "Test Updated Name";
            recipe.description = "Updated description";
            recipe.prep_time = 40;
            recipe.number_of_servings = 6;
            await recipe.save();

            const dbRecipe = await getRecipeFromDb(recipe.recipe_id);
            expect(dbRecipe.name).toBe("Test Updated Name");
            expect(dbRecipe.description).toBe("Updated description");
            expect(dbRecipe.prep_time).toBe(40);
            expect(dbRecipe.number_of_servings).toBe(6);

            await cleanupTestRecipe(recipe.recipe_id);
        }, 30000);

        it("should update only changed fields", async () => {
            const recipe = Recipe.new({
                name: "Test Partial Update",
                description: "Original",
                prep_time: 15,
                number_of_servings: 2
            });

            await recipe.save();

            const originalRecipeId = recipe.recipe_id;

            recipe.prep_time = 30;
            await recipe.save();

            const dbRecipe = await getRecipeFromDb(recipe.recipe_id);
            expect(dbRecipe.recipe_id).toBe(originalRecipeId);
            expect(dbRecipe.name).toBe("Test Partial Update");
            expect(dbRecipe.description).toBe("Original");
            expect(dbRecipe.prep_time).toBe(30);
            expect(dbRecipe.number_of_servings).toBe(2);

            await cleanupTestRecipe(recipe.recipe_id);
        }, 30000);
    });

    describe("Recipe.from_db()", () => {
        it("should retrieve recipe by recipe_id", async () => {
            const originalRecipe = Recipe.new({
                name: "Test Retrieve Recipe",
                description: "Recipe to retrieve",
                prep_time: 35,
                number_of_servings: 5
            });

            await originalRecipe.save();

            const retrievedRecipe = await Recipe.from_db({ recipe_id: originalRecipe.recipe_id });

            expect(retrievedRecipe).toBeDefined();
            expect(retrievedRecipe?.name).toBe("Test Retrieve Recipe");
            expect(retrievedRecipe?.description).toBe("Recipe to retrieve");
            expect(retrievedRecipe?.prep_time).toBe(35);
            expect(retrievedRecipe?.number_of_servings).toBe(5);
            expect(retrievedRecipe?.recipe_id).toBe(originalRecipe.recipe_id);

            await cleanupTestRecipe(originalRecipe.recipe_id);
        }, 30000);

        it("should return null for non-existent recipe_id", async () => {
            const recipe = await Recipe.from_db({ recipe_id: randomUUID() });
            expect(recipe).toBeNull();
        }, 30000);

        it("should preserve all recipe properties when retrieving from db", async () => {
            const originalRecipe = Recipe.new({
                name: "Test Full Properties",
                description: "Test with all properties",
                prep_time: 45,
                number_of_servings: 8
            });

            await originalRecipe.save();

            const retrievedRecipe = await Recipe.from_db({ recipe_id: originalRecipe.recipe_id });

            expect(retrievedRecipe?.name).toBe("Test Full Properties");
            expect(retrievedRecipe?.description).toBe("Test with all properties");
            expect(retrievedRecipe?.prep_time).toBe(45);
            expect(retrievedRecipe?.number_of_servings).toBe(8);
            expect(retrievedRecipe?.recipe_id).toBe(originalRecipe.recipe_id);

            await cleanupTestRecipe(originalRecipe.recipe_id);
        }, 30000);
    });

    describe("Recipe.exists()", () => {
        it("should return true for existing recipe", async () => {
            const recipe = Recipe.new({
                name: "Test Exists Recipe",
                description: "Recipe to check existence",
                prep_time: 20,
                number_of_servings: 3
            });

            await recipe.save();

            const exists = await Recipe.exists({ recipe_id: recipe.recipe_id });
            expect(exists).toBe(true);

            await cleanupTestRecipe(recipe.recipe_id);
        }, 30000);

        it("should return false for non-existent recipe", async () => {
            const exists = await Recipe.exists({ recipe_id: randomUUID() });
            expect(exists).toBe(false);
        }, 30000);

        it("should return true after multiple saves", async () => {
            const recipe = Recipe.new({
                name: "Test Multi-Save Recipe",
                description: "Recipe with multiple saves",
                prep_time: 10,
                number_of_servings: 2
            });

            await recipe.save();
            recipe.prep_time = 20;
            await recipe.save();

            const exists = await Recipe.exists({ recipe_id: recipe.recipe_id });
            expect(exists).toBe(true);

            await cleanupTestRecipe(recipe.recipe_id);
        }, 30000);
    });

    describe("Recipe.get_popular()", () => {
        it("should return an array of recipe summaries", async () => {
            const recipe1 = Recipe.new({
                name: "Test Popular 1",
                description: "First popular recipe",
                prep_time: 15,
                number_of_servings: 2
            });

            const recipe2 = Recipe.new({
                name: "Test Popular 2",
                description: "Second popular recipe",
                prep_time: 20,
                number_of_servings: 4
            });

            await recipe1.save();
            await recipe2.save();

            const popularRecipes = await Recipe.get_popular();

            expect(Array.isArray(popularRecipes)).toBe(true);
            expect(popularRecipes.length).toBeGreaterThan(0);

            const foundRecipe1 = popularRecipes.find(r => r.recipe_id === recipe1.recipe_id);
            const foundRecipe2 = popularRecipes.find(r => r.recipe_id === recipe2.recipe_id);

            expect(foundRecipe1).toBeDefined();
            expect(foundRecipe1?.name).toBe("Test Popular 1");
            expect(foundRecipe2).toBeDefined();
            expect(foundRecipe2?.name).toBe("Test Popular 2");

            await cleanupTestRecipe(recipe1.recipe_id);
            await cleanupTestRecipe(recipe2.recipe_id);
        }, 30000);

        it("should return at most 8 recipes", async () => {
            const popularRecipes = await Recipe.get_popular();

            expect(popularRecipes.length).toBeLessThanOrEqual(8);
        }, 30000);

        it("should return recipe summaries with recipe_id and name", async () => {
            const recipe = Recipe.new({
                name: "Test Summary Recipe",
                description: "Recipe for summary test",
                prep_time: 25,
                number_of_servings: 4
            });

            await recipe.save();

            const popularRecipes = await Recipe.get_popular();
            const foundRecipe = popularRecipes.find(r => r.recipe_id === recipe.recipe_id);

            expect(foundRecipe?.recipe_id).toBe(recipe.recipe_id);
            expect(foundRecipe?.name).toBe("Test Summary Recipe");

            await cleanupTestRecipe(recipe.recipe_id);
        }, 30000);
    });

    describe("Recipe properties", () => {
        it("should maintain all properties after round-trip to database", async () => {
            const recipe = Recipe.new({
                name: "Test Complete Properties",
                description: "Complete property test",
                prep_time: 50,
                number_of_servings: 10
            });

            await recipe.save();

            const retrieved = await Recipe.from_db({ recipe_id: recipe.recipe_id });

            expect(retrieved?.name).toBe("Test Complete Properties");
            expect(retrieved?.description).toBe("Complete property test");
            expect(retrieved?.prep_time).toBe(50);
            expect(retrieved?.number_of_servings).toBe(10);
            expect(retrieved?.recipe_id).toBe(recipe.recipe_id);

            await cleanupTestRecipe(recipe.recipe_id);
        }, 30000);

        it("should have distinct recipe_ids for different recipes", async () => {
            const recipe1 = Recipe.new({
                name: "Test Recipe A",
                description: "Recipe A",
                prep_time: 10,
                number_of_servings: 1
            });

            const recipe2 = Recipe.new({
                name: "Test Recipe B",
                description: "Recipe B",
                prep_time: 20,
                number_of_servings: 2
            });

            await recipe1.save();
            await recipe2.save();

            expect(recipe1.recipe_id).not.toBe(recipe2.recipe_id);

            await cleanupTestRecipe(recipe1.recipe_id);
            await cleanupTestRecipe(recipe2.recipe_id);
        }, 30000);

        it("should allow modification of properties before save", () => {
            const recipe = Recipe.new({
                name: "Test Original",
                description: "Original",
                prep_time: 15,
                number_of_servings: 2
            });

            recipe.name = "Test Modified";
            recipe.prep_time = 30;

            expect(recipe.name).toBe("Test Modified");
            expect(recipe.prep_time).toBe(30);
        }, 30000);

        it("should handle empty and long descriptions", async () => {
            const longDescription = "A".repeat(500);

            const recipe = Recipe.new({
                name: "Test Long Description",
                description: longDescription,
                prep_time: 20,
                number_of_servings: 4
            });

            await recipe.save();

            const retrieved = await Recipe.from_db({ recipe_id: recipe.recipe_id });
            expect(retrieved?.description).toBe(longDescription);
            expect(retrieved?.description.length).toBe(500);

            await cleanupTestRecipe(recipe.recipe_id);
        }, 30000);
    });
});
