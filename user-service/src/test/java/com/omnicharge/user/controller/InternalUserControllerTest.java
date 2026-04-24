package com.omnicharge.user.controller;

import com.omnicharge.user.dto.UserProfileResponse;
import com.omnicharge.user.service.IUserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(InternalUserController.class)
@AutoConfigureMockMvc(addFilters = false)
class InternalUserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private IUserService userService;

    @MockitoBean
    private com.omnicharge.common.logging.LogEventPublisher logEventPublisher;

    @MockitoBean
    private org.springframework.data.jpa.mapping.JpaMetamodelMappingContext jpaMetamodelMappingContext;

    @Test
    void getUserById_Success() throws Exception {
        UserProfileResponse user = new UserProfileResponse();
        user.setId(1L);
        when(userService.getUserById(anyLong())).thenReturn(user);

        mockMvc.perform(get("/api/users/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(1));
    }

    @Test
    void getUserByIdInternal_Success() throws Exception {
        UserProfileResponse user = new UserProfileResponse();
        user.setId(1L);
        when(userService.getUserById(anyLong())).thenReturn(user);

        mockMvc.perform(get("/api/users/internal/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(1));
    }
}
